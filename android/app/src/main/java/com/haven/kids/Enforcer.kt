package com.haven.kids

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.os.Build
import android.os.UserManager

/**
 * Applies a policy. As device owner (set up from a fresh phone with a QR code), Haven can lock
 * down settings and suspend apps directly. Otherwise the accessibility service opens the block
 * screen over apps that aren't allowed.
 */
object Enforcer {
    private val RESTRICTIONS = listOf(
        UserManager.DISALLOW_FACTORY_RESET,
        UserManager.DISALLOW_SAFE_BOOT,
        UserManager.DISALLOW_ADD_USER,
        UserManager.DISALLOW_DEBUGGING_FEATURES,
        UserManager.DISALLOW_CONFIG_DATE_TIME,
        UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES,
        UserManager.DISALLOW_CONFIG_CREDENTIALS,
        UserManager.DISALLOW_CONFIG_PRIVATE_DNS,
    )

    fun apply(context: Context, policy: Policy) {
        if (Signals.isDeviceOwner(context)) applyAsOwner(context, policy)
        // Without device owner, BlockerService reads the stored policy on every app switch.
    }

    private fun applyAsOwner(context: Context, policy: Policy) {
        val dpm = context.getSystemService(DevicePolicyManager::class.java)
        val admin = Signals.admin(context)
        for (r in RESTRICTIONS) dpm.addUserRestriction(admin, r)
        if (policy.blockVpnAndPrivateDns) dpm.addUserRestriction(admin, UserManager.DISALLOW_CONFIG_VPN)
        else dpm.clearUserRestriction(admin, UserManager.DISALLOW_CONFIG_VPN)
        dpm.setUninstallBlocked(admin, context.packageName, true)
        // Keep Haven's DNS filter on permanently; with lockdown, no traffic flows without it.
        try {
            dpm.setAlwaysOnVpnPackage(admin, context.packageName, true)
        } catch (e: Exception) {
            // The VPN consent hasn't been given yet; EnrollActivity asks for it.
        }

        val always = AppCatalog.alwaysAllowed(context, policy)
        val toSuspend = ArrayList<String>()
        val toRelease = ArrayList<String>()
        for (pkg in AppCatalog.launchable(context)) {
            if (pkg in always) {
                toRelease += pkg
                continue
            }
            if (policy.decide(pkg, AppCatalog.category(context, pkg)).allowed) toRelease += pkg else toSuspend += pkg
        }
        if (toSuspend.isNotEmpty()) dpm.setPackagesSuspended(admin, toSuspend.toTypedArray(), true)
        if (toRelease.isNotEmpty()) dpm.setPackagesSuspended(admin, toRelease.toTypedArray(), false)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // App installs follow the parent's setting.
            val installs = policy.json.optJSONObject("rules")?.optJSONObject("installs")?.optString("mode") ?: "ask"
            if (installs == "allow") dpm.clearUserRestriction(admin, UserManager.DISALLOW_INSTALL_APPS)
            else dpm.addUserRestriction(admin, UserManager.DISALLOW_INSTALL_APPS)
        }
    }
}
