package com.haven.kids

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import kotlin.concurrent.thread

/**
 * Shown over an app that isn't allowed right now. The child can ask for more time for this one
 * app, call someone, or press "I need help" — which always works.
 */
class BlockActivity : Activity() {
    private lateinit var store: Store

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = Store(this)
        render()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        render()
    }

    private fun render() {
        val pkg = intent.getStringExtra(EXTRA_PACKAGE) ?: ""
        val reason = intent.getStringExtra(EXTRA_REASON) ?: "Not allowed right now"
        val appName = if (pkg.isEmpty()) "this app" else AppCatalog.label(this, pkg)
        val policy = Policy.load(store)
        val col = Ui.column(this)
        col.addView(Ui.title(this, "$appName is paused"))
        col.addView(Ui.body(this, "$reason."))

        if (pkg.isNotEmpty() && policy?.requestsEnabled != false && policy?.appRule(pkg) != "block") {
            val why = Ui.input(this, "Why do you need it? (optional)")
            col.addView(why)
            for (minutes in listOf(15, 30).filter { it <= (policy?.maxMinutesPerRequest ?: 30) }) {
                col.addView(Ui.button(this, "Ask for $minutes more minutes") { ask(pkg, appName, minutes, why.text.toString()) })
            }
        }
        col.addView(Ui.button(this, "Call someone", primary = false) {
            startActivity(Intent(Intent.ACTION_DIAL).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        })
        col.addView(Ui.button(this, "I need help", primary = false) { sos() })
        col.addView(Ui.button(this, "Go home", primary = false) { goHome() })
        setContentView(col)
    }

    private fun ask(pkg: String, appName: String, minutes: Int, reason: String) {
        val token = store.token ?: return
        thread {
            val msg = try {
                Api(this).requestTime(token, pkg, appName, minutes, reason.take(200))
                "Sent! You'll get a notification when your parent answers."
            } catch (e: ApiException) {
                when (e.code) {
                    "daily_request_limit" -> "You've used all your requests for today."
                    "request_already_pending" -> "You already have a request waiting for an answer."
                    "requests_disabled" -> "Requests are turned off."
                    else -> "Couldn't send. Try again in a minute."
                }
            } catch (e: Exception) {
                "No connection. Try again in a minute."
            }
            runOnUiThread { Toast.makeText(this, msg, Toast.LENGTH_LONG).show() }
        }
    }

    private fun sos() {
        val token = store.token ?: return
        val here = Locator.lastKnown(this)
        thread {
            val ok = try {
                Api(this).sos(token, here?.latitude, here?.longitude)
                true
            } catch (e: Exception) {
                false
            }
            runOnUiThread {
                Toast.makeText(this, if (ok) "Your parents have been alerted." else "No connection — calling instead.", Toast.LENGTH_LONG).show()
                if (!ok) startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }
        }
    }

    private fun goHome() {
        startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }

    @Deprecated("Back always goes home, never back into the blocked app")
    override fun onBackPressed() = goHome()

    companion object {
        const val EXTRA_PACKAGE = "pkg"
        const val EXTRA_REASON = "reason"
    }
}
