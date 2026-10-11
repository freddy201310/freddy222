package com.haven.kids

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.UserManager
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import android.accessibilityservice.AccessibilityServiceInfo
import org.json.JSONObject
import java.util.TimeZone

/** Raw facts about the phone that reveal bypass attempts. The server decides what they mean. */
object Signals {
    fun admin(context: Context) = ComponentName(context, AdminReceiver::class.java)

    fun isDeviceOwner(context: Context): Boolean =
        context.getSystemService(DevicePolicyManager::class.java).isDeviceOwnerApp(context.packageName)

    fun isAdminActive(context: Context): Boolean =
        context.getSystemService(DevicePolicyManager::class.java).isAdminActive(admin(context))

    fun isAccessibilityOn(context: Context): Boolean {
        val am = context.getSystemService(AccessibilityManager::class.java)
        return am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            .any { it.resolveInfo.serviceInfo.packageName == context.packageName }
    }

    /** Can Haven still enforce? Device owner is enough on its own; otherwise it needs admin + accessibility + usage access. */
    fun controlsIntact(context: Context): Boolean =
        UsageCollector.hasPermission(context) && (isDeviceOwner(context) || (isAdminActive(context) && isAccessibilityOn(context)))

    fun collect(context: Context, store: Store): JSONObject {
        val cr = context.contentResolver
        val cm = context.getSystemService(ConnectivityManager::class.java)
        // The active network is a VPN only when some VPN is up; if it isn't Haven's, report it.
        val foreignVpn = cm.getNetworkCapabilities(cm.activeNetwork)?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true &&
            !FilterVpnService.running
        val users = context.getSystemService(UserManager::class.java).userProfiles.size
        val appCount = AppCatalog.launchable(context).size
        store.lastAppCount = appCount

        return JSONObject()
            .put("timeZone", TimeZone.getDefault().id)
            .put("developerOptions", Settings.Global.getInt(cr, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1)
            .put("usbDebugging", Settings.Global.getInt(cr, Settings.Global.ADB_ENABLED, 0) == 1)
            .put("vpnActive", foreignVpn)
            .put("privateDns", Settings.Global.getString(cr, "private_dns_mode") == "hostname")
            .put("controlsPermissionRevoked", store.adminWasDisabled || !controlsIntact(context))
            .put("profileRemoved", false)
            .put("secondaryUser", users > 1)
            .put("safeMode", context.packageManager.isSafeMode)
            .put("appCount", appCount)
    }
}
