package com.haven.kids

import android.Manifest
import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.TextView
import kotlin.concurrent.thread

/**
 * First run: a parent types the code from the Haven website. After that, this screen is a
 * checklist of the permissions Haven needs. There is no "disconnect" button here — only a parent
 * can remove a phone, from the website.
 */
class EnrollActivity : Activity() {
    private lateinit var store: Store

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = Store(this)
    }

    override fun onResume() {
        super.onResume()
        if (store.isEnrolled) showChecklist() else showEnroll()
    }

    private fun showEnroll() {
        val col = Ui.column(this)
        col.addView(Ui.title(this, "Set up Haven"))
        col.addView(Ui.body(this, "Parents: on the Haven website, open your child's page → Connect a phone → Samsung / Android, and type the code here."))
        val code = Ui.input(this, "Setup code (e.g. ABCD-2345)")
        val name = Ui.input(this, "Name this phone (e.g. Ava's Galaxy)")
        val status = Ui.body(this, "")
        col.addView(code)
        col.addView(name)
        col.addView(status)
        col.addView(Ui.button(this, "Connect") {
            status.text = "Connecting…"
            val c = code.text.toString().trim()
            val n = name.text.toString().trim().ifEmpty { Build.MODEL }
            thread {
                val result = try {
                    val r = Api(this).enroll(c, n, "${Build.MANUFACTURER} ${Build.MODEL}".take(60), "Android ${Build.VERSION.RELEASE}")
                    store.token = r.getString("deviceToken")
                    store.childName = r.optString("childName")
                    null
                } catch (e: ApiException) {
                    when (e.code) {
                        "invalid_or_expired_code" -> "That code didn't work or has expired. Make a new one on the website."
                        "wrong_platform" -> "That code is for an iPhone. Make a Samsung / Android code instead."
                        "rate_limited" -> "Too many tries. Wait 15 minutes."
                        else -> "Something went wrong (${e.code})."
                    }
                } catch (e: Exception) {
                    "No internet connection."
                }
                runOnUiThread {
                    if (result == null) {
                        HavenService.start(this)
                        showChecklist()
                    } else {
                        status.text = result
                    }
                }
            }
        })
        setContentView(col)
    }

    private fun showChecklist() {
        val col = Ui.column(this)
        col.addView(Ui.title(this, "Haven is on"))
        col.addView(Ui.body(this, "Protecting ${store.childName.ifEmpty { "this phone" }}. Finish each step below — a parent should do this."))

        val owner = Signals.isDeviceOwner(this)
        step(col, "Usage access", UsageCollector.hasPermission(this)) {
            startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }
        if (!owner) {
            step(col, "Device admin (stops Haven being removed)", Signals.isAdminActive(this)) {
                startActivity(
                    Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
                        .putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, Signals.admin(this))
                        .putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Lets Haven tell your parent if someone tries to remove it."),
                )
            }
            step(col, "Accessibility (pauses apps when time's up)", Signals.isAccessibilityOn(this)) {
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            }
        }
        step(col, "Web filter", VpnService.prepare(this) == null) {
            VpnService.prepare(this)?.let { startActivityForResult(it, REQ_VPN) }
        }
        step(col, "Location", checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION), REQ_LOCATION)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            step(col, "Notifications", checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTIFY)
            }
        }
        if (!owner) {
            col.addView(
                Ui.body(
                    this,
                    "Strongest protection: set Haven up on a freshly reset phone with the QR code from the website. " +
                        "Then Haven can block factory resets, developer options, and new users.",
                ),
            )
        }
        col.addView(Ui.button(this, "I need help", primary = false) {
            startActivity(Intent(this, BlockActivity::class.java).putExtra(BlockActivity.EXTRA_REASON, "Use the buttons below to reach your parents"))
        })
        setContentView(col)
    }

    private fun step(col: android.widget.LinearLayout, label: String, done: Boolean, fix: () -> Unit) {
        if (done) {
            col.addView(TextView(this).apply { text = "✓  $label"; textSize = 16f; setTextColor(Ui.GREEN); setPadding(0, Ui.dp(this@EnrollActivity, 10), 0, 0) })
        } else {
            col.addView(Ui.button(this, "Turn on: $label", primary = true, onClick = fix))
        }
    }

    @Deprecated("Framework callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_VPN && resultCode == RESULT_OK) FilterVpnService.startIfPrepared(this)
    }

    companion object {
        private const val REQ_VPN = 1
        private const val REQ_LOCATION = 2
        private const val REQ_NOTIFY = 3
    }
}
