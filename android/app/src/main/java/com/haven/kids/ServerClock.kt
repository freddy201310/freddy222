package com.haven.kids

import android.os.SystemClock

/**
 * Time that a child can't change. We remember the server's time together with the phone's
 * monotonic clock (which keeps counting regardless of the date/time settings) and add the
 * difference. Changing the phone's clock or time zone has no effect on it.
 */
object ServerClock {
    @Volatile private var serverMillisAtSync = 0L
    @Volatile private var elapsedAtSync = 0L

    val isSynced: Boolean get() = elapsedAtSync != 0L

    fun sync(serverMillis: Long) {
        serverMillisAtSync = serverMillis
        elapsedAtSync = SystemClock.elapsedRealtime()
    }

    /** Best-known real time in epoch milliseconds. Falls back to the wall clock only before the first sync. */
    fun now(): Long = if (isSynced) serverMillisAtSync + (SystemClock.elapsedRealtime() - elapsedAtSync) else System.currentTimeMillis()
}
