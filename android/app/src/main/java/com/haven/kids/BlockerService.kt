package com.haven.kids

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

/**
 * Notices which app comes to the front and covers it with the block screen when the rules say
 * so. It reads only the app's package name — never what's on the screen.
 */
class BlockerService : AccessibilityService() {
    private var always: Set<String> = emptySet()
    private var alwaysLoadedAt = 0L

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        val store = Store(this)
        if (!store.isEnrolled) return
        val policy = Policy.load(store) ?: return
        if (System.currentTimeMillis() - alwaysLoadedAt > 60_000) {
            always = AppCatalog.alwaysAllowed(this, policy)
            alwaysLoadedAt = System.currentTimeMillis()
        }
        if (pkg in always) return
        val decision = policy.decide(pkg, AppCatalog.category(this, pkg))
        if (!decision.allowed) {
            startActivity(
                Intent(this, BlockActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    .putExtra(BlockActivity.EXTRA_PACKAGE, pkg)
                    .putExtra(BlockActivity.EXTRA_REASON, decision.reason),
            )
        }
    }

    override fun onInterrupt() {}

    override fun onUnbind(intent: Intent?): Boolean {
        // Accessibility switched off: report it right away.
        HavenService.checkInNow(this)
        return super.onUnbind(intent)
    }
}
