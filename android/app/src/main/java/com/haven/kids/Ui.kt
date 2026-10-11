package com.haven.kids

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

/** Tiny view helpers so the app needs no layout files or support libraries. */
object Ui {
    const val GREEN = 0xFF14806B.toInt()
    const val INK = 0xFF151D31.toInt()
    const val MUTED = 0xFF4F6697.toInt()

    fun dp(context: Context, v: Int) = (v * context.resources.displayMetrics.density).toInt()

    fun column(context: Context) = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        val pad = dp(context, 24)
        setPadding(pad, pad * 2, pad, pad)
        setBackgroundColor(Color.WHITE)
    }

    fun title(context: Context, text: String) = TextView(context).apply {
        this.text = text
        textSize = 26f
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(INK)
    }

    fun body(context: Context, text: String) = TextView(context).apply {
        this.text = text
        textSize = 16f
        setTextColor(MUTED)
        setPadding(0, dp(context, 8), 0, dp(context, 8))
    }

    fun input(context: Context, hint: String) = EditText(context).apply {
        this.hint = hint
        textSize = 18f
        setSingleLine()
    }

    fun button(context: Context, text: String, primary: Boolean = true, onClick: () -> Unit) = Button(context).apply {
        this.text = text
        isAllCaps = false
        textSize = 16f
        setTextColor(if (primary) Color.WHITE else INK)
        background = GradientDrawable().apply {
            cornerRadius = dp(context, 12).toFloat()
            setColor(if (primary) GREEN else 0xFFE8EDF6.toInt())
        }
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(context, 12)
        }
        gravity = Gravity.CENTER
        setOnClickListener { onClick() }
    }
}
