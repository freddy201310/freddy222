package com.haven.kids

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.telecom.TelecomManager

/** Maps installed apps to Haven's categories, and knows which apps must always work. */
object AppCatalog {
    private val KNOWN = mapOf(
        "com.instagram.android" to "social", "com.zhiliaoapp.musically" to "social", "com.ss.android.ugc.trill" to "social",
        "com.snapchat.android" to "social", "com.facebook.katana" to "social", "com.twitter.android" to "social",
        "com.reddit.frontpage" to "social", "com.pinterest" to "social", "com.bereal.ft" to "social",
        "com.whatsapp" to "messaging", "org.telegram.messenger" to "messaging", "com.discord" to "messaging",
        "com.facebook.orca" to "messaging", "org.thoughtcrime.securesms" to "messaging", "com.kik.android" to "messaging",
        "com.google.android.youtube" to "video", "com.netflix.mediaclient" to "video", "tv.twitch.android.app" to "video",
        "com.disney.disneyplus" to "video", "com.amazon.avod.thirdpartyclient" to "video", "com.google.android.apps.youtube.kids" to "video",
        "com.roblox.client" to "games", "com.mojang.minecraftpe" to "games", "com.epicgames.fortnite" to "games",
        "com.supercell.clashroyale" to "games", "com.supercell.brawlstars" to "games",
        "com.android.chrome" to "browsers", "org.mozilla.firefox" to "browsers", "com.sec.android.app.sbrowser" to "browsers",
        "com.opera.browser" to "browsers", "com.brave.browser" to "browsers", "com.duckduckgo.mobile.android" to "browsers",
        "com.microsoft.emmx" to "browsers",
        "com.amazon.mShop.android.shopping" to "shopping", "com.einnovation.temu" to "shopping", "com.zzkko" to "shopping",
        "org.khanacademy.android" to "education", "com.duolingo" to "education", "com.google.android.apps.classroom" to "education",
        "com.quizlet.quizletandroid" to "education", "com.google.android.apps.docs" to "education",
        "com.adobe.spark.post" to "creativity", "com.canva.editor" to "creativity",
    )

    private val MAPS = setOf("com.google.android.apps.maps", "com.waze", "com.here.app.maps")
    private val MESSAGES = setOf("com.google.android.apps.messaging", "com.samsung.android.messaging", "com.android.mms")
    private val EMERGENCY = setOf(
        "com.android.phone", "com.android.emergency", "com.samsung.android.emergency", "com.google.android.dialer",
        "com.samsung.android.dialer", "com.android.server.telecom", "com.android.systemui", "com.android.settings",
    )

    fun category(context: Context, pkg: String): String? {
        KNOWN[pkg]?.let { return it }
        val info = try { context.packageManager.getApplicationInfo(pkg, 0) } catch (e: PackageManager.NameNotFoundException) { return null }
        return when (info.category) {
            ApplicationInfo.CATEGORY_GAME -> "games"
            ApplicationInfo.CATEGORY_SOCIAL -> "social"
            ApplicationInfo.CATEGORY_VIDEO -> "video"
            ApplicationInfo.CATEGORY_AUDIO -> "video"
            ApplicationInfo.CATEGORY_IMAGE -> "creativity"
            else -> null
        }
    }

    fun label(context: Context, pkg: String): String = try {
        val pm = context.packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString().take(80)
    } catch (e: Exception) {
        pkg.take(80)
    }

    /**
     * Apps that keep working during downtime, after the limit, and while locked: the phone app,
     * emergency services, the home screen, Haven itself, and (if the parent allows) maps and messages.
     */
    fun alwaysAllowed(context: Context, policy: Policy?): Set<String> {
        val out = HashSet<String>(EMERGENCY)
        out += context.packageName
        context.getSystemService(TelecomManager::class.java)?.defaultDialerPackage?.let { out += it }
        homePackage(context)?.let { out += it }
        if (policy?.mapsAllowed != false) out += MAPS
        if (policy?.messagesAllowed != false) out += MESSAGES
        return out
    }

    fun homePackage(context: Context): String? =
        context.packageManager.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), PackageManager.MATCH_DEFAULT_ONLY)
            ?.activityInfo?.packageName

    /** Every app with a launcher icon (what a child can actually open). */
    fun launchable(context: Context): List<String> =
        context.packageManager.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
            .map { it.activityInfo.packageName }
            .distinct()
}
