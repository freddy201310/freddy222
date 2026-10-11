package com.haven.kids

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.BatteryManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import org.json.JSONObject
import java.time.Instant

/**
 * Runs all the time: checks in with the server about once a minute, applies the rules it gets
 * back, and keeps the DNS filter running. Starts again on boot.
 */
class HavenService : Service() {
    private lateinit var thread: HandlerThread
    private lateinit var handler: Handler
    private lateinit var store: Store
    private lateinit var api: Api

    override fun onCreate() {
        super.onCreate()
        store = Store(this)
        api = Api(this)
        thread = HandlerThread("haven-checkin").apply { start() }
        handler = Handler(thread.looper)
        val notification = Notification.Builder(this, HavenApp.CHANNEL_STATUS)
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentTitle("Haven is on")
            .setContentText("Your parent's screen-time rules are active.")
            .setOngoing(true)
            .setContentIntent(PendingIntent.getActivity(this, 0, Intent(this, EnrollActivity::class.java), PendingIntent.FLAG_IMMUTABLE))
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        FilterVpnService.startIfPrepared(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        handler.removeCallbacksAndMessages(null)
        handler.post(::tick)
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        thread.quitSafely()
        super.onDestroy()
    }

    private fun tick() {
        var delaySeconds = 60
        try {
            val token = store.token ?: return stopSelf()
            val cached = Policy.load(store)
            val body = JSONObject()
                .put("appliedPolicyVersion", store.appliedPolicyVersion)
                .put("deviceTime", Instant.ofEpochMilli(System.currentTimeMillis()).toString())
                .put("osVersion", "Android ${Build.VERSION.RELEASE}")
                .put("signals", Signals.collect(this, store))
                .put("usage", UsageCollector.today(this, cached?.timeZone ?: "UTC"))
            battery()?.let { body.put("battery", it) }
            if (cached?.locationEnabled != false) Locator.lastKnown(this)?.let {
                body.put("location", JSONObject().put("latitude", it.latitude).put("longitude", it.longitude))
            }

            val response = api.heartbeat(token, body)
            val policy = Policy(response)
            ServerClock.sync(policy.serverTime)
            store.policyJson = response.toString()
            Enforcer.apply(this, policy)
            store.appliedPolicyVersion = policy.version
            store.adminWasDisabled = store.adminWasDisabled && !Signals.isAdminActive(this)
            delaySeconds = policy.nextCheckInSeconds
            FilterVpnService.onPolicy(this)
            notifyAnswers(token)
        } catch (e: ApiException) {
            if (e.status == 401) {
                // A parent removed this phone on the website.
                store.token = null
                store.policyJson = null
                stopSelf()
                return
            }
        } catch (e: Exception) {
            // Offline: keep enforcing the last policy we had, and try again soon.
            Policy.load(store)?.let { Enforcer.apply(this, it) }
            delaySeconds = 30
        }
        handler.postDelayed(::tick, delaySeconds * 1000L)
    }

    private fun battery(): Int? =
        getSystemService(BatteryManager::class.java)?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)?.takeIf { it in 0..100 }

    /** Tell the child when a parent answers a request for more time. */
    private fun notifyAnswers(token: String) {
        val prefs = getSharedPreferences("haven-answers", MODE_PRIVATE)
        val list = api.myRequests(token).optJSONArray("requests") ?: return
        val nm = getSystemService(android.app.NotificationManager::class.java)
        for (i in 0 until list.length()) {
            val r = list.getJSONObject(i)
            val id = r.optString("id")
            val status = r.optString("status")
            if (status == "PENDING" || prefs.getBoolean(id, false)) continue
            prefs.edit().putBoolean(id, true).apply()
            val text = if (status == "APPROVED") "You got ${r.optInt("grantedMins")} more minutes of ${r.optString("appName")}." else "Your request for ${r.optString("appName")} wasn't approved this time."
            nm.notify(
                id.hashCode(),
                Notification.Builder(this, HavenApp.CHANNEL_ANSWERS)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle(if (status == "APPROVED") "Approved!" else "Not this time")
                    .setContentText(text)
                    .setAutoCancel(true)
                    .build(),
            )
        }
    }

    companion object {
        private const val NOTIFICATION_ID = 1

        fun start(context: Context) {
            context.startForegroundService(Intent(context, HavenService::class.java))
        }

        fun checkInNow(context: Context) = start(context)
    }
}
