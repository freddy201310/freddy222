package com.haven.kids

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

class AdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        Store(context).adminWasDisabled = false
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence =
        "Turning this off tells your parent and locks the phone until they check it."

    override fun onDisabled(context: Context, intent: Intent) {
        // Reported as a bypass attempt at the next check-in.
        Store(context).adminWasDisabled = true
        HavenService.checkInNow(context)
    }

    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        context.startActivity(Intent(context, EnrollActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
