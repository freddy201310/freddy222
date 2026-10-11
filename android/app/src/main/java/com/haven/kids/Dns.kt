package com.haven.kids

import java.net.InetAddress
import java.nio.ByteBuffer

/** Just enough DNS and IPv4/UDP packet handling for a DNS filter. */
object Dns {
    const val TYPE_A = 1
    const val TYPE_AAAA = 28

    class Query(val id: Int, val name: String, val type: Int, val questionEnd: Int, val raw: ByteArray)

    fun parseQuery(msg: ByteArray): Query? {
        if (msg.size < 12) return null
        val flags = u16(msg, 2)
        if (flags and 0x8000 != 0) return null // a response, not a query
        if (u16(msg, 4) != 1) return null // exactly one question
        var i = 12
        val labels = ArrayList<String>()
        while (true) {
            if (i >= msg.size) return null
            val len = msg[i].toInt() and 0xFF
            if (len == 0) { i++; break }
            if (len and 0xC0 != 0 || i + 1 + len > msg.size) return null
            labels += String(msg, i + 1, len, Charsets.US_ASCII)
            i += 1 + len
        }
        if (i + 4 > msg.size) return null
        return Query(u16(msg, 0), labels.joinToString(".").lowercase(), u16(msg, i), i + 4, msg)
    }

    /** A reply to [q] with the given addresses (IPv4 for A, IPv6 for AAAA). An empty list means "no records". */
    fun answer(q: Query, addresses: List<InetAddress>, ttl: Int = 300): ByteArray {
        val wanted = addresses.filter { (q.type == TYPE_A && it.address.size == 4) || (q.type == TYPE_AAAA && it.address.size == 16) }
        val buf = ByteBuffer.allocate(q.questionEnd + wanted.sumOf { 12 + it.address.size })
        buf.put(q.raw, 0, q.questionEnd)
        val rd = q.raw[2].toInt() and 0x01
        buf.put(2, (0x80 or rd).toByte()) // QR=1, opcode 0, RD copied
        buf.put(3, 0x80.toByte()) // RA=1, RCODE=0
        buf.putShort(6, wanted.size.toShort())
        buf.putShort(8, 0)
        buf.putShort(10, 0)
        buf.position(q.questionEnd)
        for (a in wanted) {
            buf.putShort(0xC00C.toShort()) // pointer to the question name
            buf.putShort(q.type.toShort())
            buf.putShort(1) // class IN
            buf.putInt(ttl)
            buf.putShort(a.address.size.toShort())
            buf.put(a.address)
        }
        return buf.array()
    }

    /** "Blocked" reply: 0.0.0.0 / :: so apps fail fast instead of retrying. */
    fun blocked(q: Query): ByteArray = when (q.type) {
        TYPE_A -> answer(q, listOf(InetAddress.getByAddress(ByteArray(4))), 60)
        TYPE_AAAA -> answer(q, listOf(InetAddress.getByAddress(ByteArray(16))), 60)
        else -> answer(q, emptyList(), 60)
    }

    /** Build a fresh A query for [name]. */
    fun query(name: String, id: Int, type: Int = TYPE_A): ByteArray {
        val labels = name.trimEnd('.').split(".")
        val buf = ByteBuffer.allocate(12 + labels.sumOf { it.length + 1 } + 1 + 4)
        buf.putShort(id.toShort()).putShort(0x0100).putShort(1).putShort(0).putShort(0).putShort(0)
        for (l in labels) {
            buf.put(l.length.toByte())
            buf.put(l.toByteArray(Charsets.US_ASCII))
        }
        buf.put(0).putShort(type.toShort()).putShort(1)
        return buf.array()
    }

    /** Addresses of the given type in a DNS response (follows the answer section, ignores names). */
    fun addresses(resp: ByteArray, type: Int = TYPE_A): List<InetAddress> {
        if (resp.size < 12) return emptyList()
        val qd = u16(resp, 4)
        val an = u16(resp, 6)
        var i = 12
        repeat(qd) { i = skipName(resp, i) + 4 }
        val out = ArrayList<InetAddress>()
        repeat(an) {
            i = skipName(resp, i)
            if (i + 10 > resp.size) return out
            val t = u16(resp, i)
            val len = u16(resp, i + 8)
            i += 10
            if (i + len > resp.size) return out
            if (t == type && (len == 4 || len == 16)) out += InetAddress.getByAddress(resp.copyOfRange(i, i + len))
            i += len
        }
        return out
    }

    private fun skipName(b: ByteArray, start: Int): Int {
        var i = start
        while (i < b.size) {
            val len = b[i].toInt() and 0xFF
            if (len == 0) return i + 1
            if (len and 0xC0 == 0xC0) return i + 2
            i += 1 + len
        }
        return i
    }

    /** "m.example.com" matches "example.com"; "notexample.com" doesn't. */
    fun matches(host: String, domain: String) = host == domain || host.endsWith(".$domain")

    fun u16(b: ByteArray, i: Int) = ((b[i].toInt() and 0xFF) shl 8) or (b[i + 1].toInt() and 0xFF)

    // ── IPv4 / UDP ───────────────────────────────────────────────────────────

    class Udp(val src: ByteArray, val dst: ByteArray, val srcPort: Int, val dstPort: Int, val payload: ByteArray)

    fun parseUdp(packet: ByteArray, length: Int): Udp? {
        if (length < 28 || (packet[0].toInt() shr 4) != 4) return null
        val ihl = (packet[0].toInt() and 0x0F) * 4
        if (packet[9].toInt() != 17 || length < ihl + 8) return null
        val udpLen = u16(packet, ihl + 4)
        val end = minOf(length, ihl + udpLen)
        if (end < ihl + 8) return null
        return Udp(
            packet.copyOfRange(12, 16), packet.copyOfRange(16, 20),
            u16(packet, ihl), u16(packet, ihl + 2),
            packet.copyOfRange(ihl + 8, end),
        )
    }

    /** Wrap a DNS reply in IPv4/UDP going back to whoever asked. */
    fun reply(to: Udp, payload: ByteArray): ByteArray {
        val total = 20 + 8 + payload.size
        val b = ByteBuffer.allocate(total)
        b.put(0x45).put(0).putShort(total.toShort()).putShort(0).putShort(0x4000.toShort())
        b.put(64).put(17).putShort(0)
        b.put(to.dst).put(to.src)
        b.putShort(to.dstPort.toShort()).putShort(to.srcPort.toShort()).putShort((8 + payload.size).toShort()).putShort(0)
        b.put(payload)
        val arr = b.array()
        val sum = checksum(arr, 0, 20)
        arr[10] = (sum shr 8).toByte()
        arr[11] = sum.toByte()
        return arr
    }

    fun checksum(b: ByteArray, off: Int, len: Int): Int {
        var sum = 0
        var i = off
        while (i < off + len - 1) {
            sum += u16(b, i)
            i += 2
        }
        if (len % 2 == 1) sum += (b[off + len - 1].toInt() and 0xFF) shl 8
        while (sum shr 16 != 0) sum = (sum and 0xFFFF) + (sum shr 16)
        return sum.inv() and 0xFFFF
    }
}
