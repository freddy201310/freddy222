package com.haven.kids

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager

class HavenApp : Application() {
    override fun onCreate() {
        super.onCreate()
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_STATUS, "Haven status", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Shows that Haven is protecting this phone"
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ANSWERS, "Answers from your parent", NotificationManager.IMPORTANCE_DEFAULT),
        )
        if (Store(this).isEnrolled) HavenService.start(this)
    }

    companion object {
        const val CHANNEL_STATUS = "status"
        const val CHANNEL_ANSWERS = "answers"
    }
}
