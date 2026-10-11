package com.haven.kids

import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import org.json.JSONObject
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import kotlin.concurrent.thread

/**
 * Haven's web filter. It only captures DNS (the phone's "look up this website" requests), so
 * every browser and every in-app browser is covered, while normal traffic never passes through it.
 * - SafeSearch and YouTube Restricted Mode are forced by answering with the restricted servers.
 * - The parent's block/allow lists and blocked categories are applied.
 * - Everything else is resolved by a family-safe DNS service that also blocks adult sites.
 */
class FilterVpnService : VpnService() {
    private var tun: ParcelFileDescriptor? = null
    private val pool = Executors.newFixedThreadPool(8)
    private val cache = ConcurrentHashMap<String, Pair<Boolean, Long>>()

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (tun == null) establish()
        return START_STICKY
    }

    private fun establish() {
        val b = Builder()
            .setSession("Haven web filter")
            .addAddress(TUN_ADDRESS, 32)
            .addDnsServer(DNS_ADDRESS)
            .addRoute(DNS_ADDRESS, 32)
            .setBlocking(true)
        // Apps that hard-code a public DNS server get filtered too.
        for (ip in PUBLIC_DNS) b.addRoute(ip, 32)
        try { b.addDisallowedApplication(packageName) } catch (e: Exception) {}
        tun = b.establish() ?: return
        running = true
        val fd = tun!!.fileDescriptor
        thread(name = "haven-dns") {
            val input = FileInputStream(fd)
            val output = FileOutputStream(fd)
            val buf = ByteArray(32767)
            try {
                while (true) {
                    val n = input.read(buf)
                    if (n <= 0) continue
                    val udp = Dns.parseUdp(buf, n) ?: continue
                    if (udp.dstPort != 53) continue
                    pool.execute { handle(udp, output) }
                }
            } catch (e: Exception) {
                running = false
            }
        }
    }

    private fun handle(udp: Dns.Udp, out: FileOutputStream) {
        val q = Dns.parseQuery(udp.payload) ?: return
        val lists = current
        val host = q.name.removePrefix("www.")
        val reply: ByteArray? = when {
            lists.dohHosts.any { Dns.matches(q.name, it) } -> Dns.blocked(q)
            lists.allow.any { Dns.matches(host, it) } -> forward(udp.payload, lists.upstream)
            lists.block.any { Dns.matches(host, it) } -> Dns.blocked(q)
            lists.allowListOnly -> Dns.blocked(q)
            lists.rewrites.containsKey(q.name) -> rewrite(q, lists.rewrites.getValue(q.name), lists.upstream)
            lists.categoryChecks && !allowedByCategory(host) -> Dns.blocked(q)
            else -> forward(udp.payload, lists.upstream)
        }
        reply ?: return
        val packet = Dns.reply(udp, reply)
        synchronized(out) { out.write(packet) }
    }

    /** Asks Haven about a site, caching the answer. Fails open: adult sites are still caught by the family DNS. */
    private fun allowedByCategory(host: String): Boolean {
        cache[host]?.let { (ok, until) -> if (until > System.currentTimeMillis()) return ok }
        val token = Store(this).token ?: return true
        return try {
            val r = Api(this).webCheck(token, host)
            val ok = r.optBoolean("allowed", true)
            cache[host] = ok to System.currentTimeMillis() + r.optInt("ttl", 21600) * 1000L
            ok
        } catch (e: Exception) {
            cache[host] = true to System.currentTimeMillis() + 60_000L
            true
        }
    }

    private fun rewrite(q: Dns.Query, target: String, upstream: String): ByteArray? {
        if (q.type != Dns.TYPE_A) return Dns.answer(q, emptyList()) // force IPv4 so the rewrite holds
        val resp = forward(Dns.query(target, q.id), upstream) ?: return null
        return Dns.answer(q, Dns.addresses(resp, Dns.TYPE_A))
    }

    private fun forward(query: ByteArray, upstream: String): ByteArray? = try {
        DatagramSocket().use { s ->
            protect(s) // the filter's own lookups must not loop back into the filter
            s.soTimeout = 3000
            s.send(DatagramPacket(query, query.size, InetAddress.getByName(upstream), 53))
            val buf = ByteArray(4096)
            val p = DatagramPacket(buf, buf.size)
            s.receive(p)
            buf.copyOf(p.length)
        }
    } catch (e: Exception) {
        null
    }

    override fun onRevoke() {
        // Another VPN took over or the user switched the filter off: report it.
        running = false
        HavenService.checkInNow(this)
        super.onRevoke()
    }

    override fun onDestroy() {
        running = false
        tun?.close()
        tun = null
        pool.shutdownNow()
        super.onDestroy()
    }

    private class Lists(
        val version: Int = -1,
        val allow: List<String> = emptyList(),
        val block: List<String> = emptyList(),
        val allowListOnly: Boolean = false,
        val rewrites: Map<String, String> = emptyMap(),
        val upstream: String = "1.1.1.3",
        val categoryChecks: Boolean = false,
        val dohHosts: List<String> = emptyList(),
    )

    companion object {
        private const val TUN_ADDRESS = "10.111.0.2"
        private const val DNS_ADDRESS = "10.111.0.1"
        private val PUBLIC_DNS = listOf("8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1", "9.9.9.9", "149.112.112.112", "208.67.222.222", "208.67.220.220")

        @Volatile var running = false
        @Volatile private var current = Lists()

        fun startIfPrepared(context: Context) {
            if (prepare(context) == null) context.startService(Intent(context, FilterVpnService::class.java))
        }

        /** Refresh the filter's lists when the parent's rules change. Called after each check-in. */
        fun onPolicy(context: Context) {
            val store = Store(context)
            val version = store.appliedPolicyVersion
            if (version == current.version) return
            val token = store.token ?: return
            val r: JSONObject = try { Api(context).blocklist(token) } catch (e: Exception) { return }
            fun list(key: String) = r.optJSONArray(key)?.let { a -> (0 until a.length()).map { a.getString(it) } } ?: emptyList()
            val rw = r.optJSONObject("rewrites")
            current = Lists(
                version = version,
                allow = list("allowDomains"),
                block = list("blockDomains"),
                allowListOnly = r.optBoolean("allowListOnly", false),
                rewrites = rw?.keys()?.asSequence()?.associateWith { rw.getString(it) } ?: emptyMap(),
                upstream = r.optJSONObject("upstreamDns")?.optJSONArray("ipv4")?.optString(0)?.takeIf { it.isNotEmpty() } ?: "1.1.1.1",
                categoryChecks = (r.optJSONArray("blockCategories")?.length() ?: 0) > 0,
                dohHosts = list("blockDohHosts"),
            )
            startIfPrepared(context)
        }
    }
}
