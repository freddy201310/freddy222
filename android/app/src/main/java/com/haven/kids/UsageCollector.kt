package com.haven.kids

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Process
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId

/** Minutes each app was in the foreground today, where "today" is the family's day. */
object UsageCollector {
    fun hasPermission(context: Context): Boolean {
        val ops = context.getSystemService(AppOpsManager::class.java)
        return ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName) == AppOpsManager.MODE_ALLOWED
    }

    fun today(context: Context, timeZone: String): JSONArray {
        val out = JSONArray()
        if (!hasPermission(context)) return out
        val zone = try { ZoneId.of(timeZone) } catch (e: Exception) { ZoneId.systemDefault() }
        val now = ServerClock.now()
        val start = Instant.ofEpochMilli(now).atZone(zone).toLocalDate().atStartOfDay(zone).toInstant().toEpochMilli()
        // UsageStatsManager timestamps use the wall clock; correct for a phone clock that was moved.
        val skew = System.currentTimeMillis() - now
        val usm = context.getSystemService(UsageStatsManager::class.java)
        val events = usm.queryEvents(start + skew, now + skew)
        val openedAt = HashMap<String, Long>()
        val totals = HashMap<String, Long>()
        val e = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(e)
            when (e.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> openedAt[e.packageName] = e.timeStamp
                UsageEvents.Event.ACTIVITY_PAUSED, UsageEvents.Event.ACTIVITY_STOPPED -> openedAt.remove(e.packageName)?.let { t ->
                    totals[e.packageName] = (totals[e.packageName] ?: 0L) + (e.timeStamp - t)
                }
            }
        }
        // Apps still open right now count up to this moment.
        for ((pkg, t) in openedAt) totals[pkg] = (totals[pkg] ?: 0L) + (now + skew - t)

        val always = AppCatalog.alwaysAllowed(context, null)
        for ((pkg, ms) in totals) {
            val minutes = (ms / 60_000L).toInt()
            if (minutes <= 0 || pkg in always) continue
            out.put(
                JSONObject()
                    .put("appId", pkg)
                    .put("appName", AppCatalog.label(context, pkg))
                    .put("category", AppCatalog.category(context, pkg) ?: "")
                    .put("minutes", minutes.coerceAtMost(1440)),
            )
        }
        return out
    }
}
