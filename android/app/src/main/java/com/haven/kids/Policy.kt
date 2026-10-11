package com.haven.kids

import org.json.JSONObject

/** One "may this be used now?" answer from the server. */
data class Decision(val allowed: Boolean, val reason: String, val remainingMinutes: Int?)

/**
 * The compiled policy from the last heartbeat. The server decides; the phone only looks up
 * answers and counts remaining minutes down on the tamper-proof [ServerClock].
 */
class Policy(val json: JSONObject) {
    val version: Int = json.optInt("policyVersion", 0)
    val serverTime: Long = parseIso(json.optString("serverTime"))
    val timeZone: String = json.optString("timeZone", "UTC")
    val nextCheckInSeconds: Int = json.optInt("nextCheckInSeconds", 60).coerceIn(15, 900)

    private val state: JSONObject = json.optJSONObject("state") ?: JSONObject()
    val mode: String = state.optString("mode", "open")
    val reason: String = state.optString("reason", "")

    private val rules: JSONObject = json.optJSONObject("rules") ?: JSONObject()
    val mapsAllowed: Boolean = rules.optJSONObject("alwaysAllowed")?.optBoolean("maps", true) ?: true
    val messagesAllowed: Boolean = rules.optJSONObject("alwaysAllowed")?.optBoolean("approvedContactsMessaging", true) ?: true
    val locationEnabled: Boolean = rules.optJSONObject("location")?.optBoolean("enabled", true) ?: true
    val requestsEnabled: Boolean = rules.optJSONObject("requests")?.optBoolean("enabled", true) ?: true
    val maxMinutesPerRequest: Int = rules.optJSONObject("requests")?.optInt("maxMinutesPerRequest", 30) ?: 30
    val blockVpnAndPrivateDns: Boolean = rules.optJSONObject("web")?.optBoolean("blockPrivateDnsAndVpn", true) ?: true

    private val apps: JSONObject = json.optJSONObject("apps") ?: JSONObject()
    private val categories: JSONObject = json.optJSONObject("categories") ?: JSONObject()

    /** Explicit per-app rules the parent set ("always", "block", "limit"). */
    fun appRule(pkg: String): String? {
        val list = rules.optJSONArray("apps") ?: return null
        for (i in 0 until list.length()) {
            val a = list.getJSONObject(i)
            if (a.optString("appId") == pkg) return a.optString("rule")
        }
        return null
    }

    fun decide(pkg: String, category: String?): Decision {
        val found = apps.optJSONObject(pkg) ?: category?.let { categories.optJSONObject(it) }
        val raw = when {
            found != null -> Decision(found.optBoolean("allowed", false), found.optString("reason"), if (found.isNull("remaining")) null else found.optInt("remaining"))
            // Apps the server hasn't seen yet with no known category follow the overall state.
            mode == "open" -> Decision(true, "Allowed", null)
            else -> Decision(false, reason, 0)
        }
        return countDown(raw)
    }

    /** Remaining minutes were computed at [serverTime]; subtract the time since then. */
    private fun countDown(d: Decision): Decision {
        val left = d.remainingMinutes ?: return d
        val elapsed = ((ServerClock.now() - serverTime) / 60_000L).toInt().coerceAtLeast(0)
        val now = left - elapsed
        return if (d.allowed && now <= 0) Decision(false, "Time limit reached", 0) else d.copy(remainingMinutes = now.coerceAtLeast(0))
    }

    companion object {
        fun parseIso(s: String): Long = try { java.time.Instant.parse(s).toEpochMilli() } catch (e: Exception) { System.currentTimeMillis() }
        fun load(store: Store): Policy? = store.policyJson?.let { try { Policy(JSONObject(it)) } catch (e: Exception) { null } }
    }
}
