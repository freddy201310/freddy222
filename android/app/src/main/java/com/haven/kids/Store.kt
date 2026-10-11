package com.haven.kids

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Local state. The device token is encrypted with a key that lives in the Android Keystore,
 * so it can't be copied off the phone to impersonate it.
 */
class Store(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("haven", Context.MODE_PRIVATE)

    val isEnrolled: Boolean get() = prefs.contains(KEY_TOKEN)

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)?.let { decrypt(it) }
        set(value) {
            prefs.edit().apply { if (value == null) remove(KEY_TOKEN) else putString(KEY_TOKEN, encrypt(value)) }.apply()
        }

    var childName: String
        get() = prefs.getString("childName", "") ?: ""
        set(v) = prefs.edit().putString("childName", v).apply()

    /** The last policy received from the server, so rules keep working offline. */
    var policyJson: String?
        get() = prefs.getString("policy", null)
        set(v) = prefs.edit().putString("policy", v).apply()

    var appliedPolicyVersion: Int
        get() = prefs.getInt("appliedVersion", 0)
        set(v) = prefs.edit().putInt("appliedVersion", v).apply()

    var lastAppCount: Int
        get() = prefs.getInt("appCount", -1)
        set(v) = prefs.edit().putInt("appCount", v).apply()

    /** Set when the device-admin permission is switched off, reported as tampering at next check-in. */
    var adminWasDisabled: Boolean
        get() = prefs.getBoolean("adminDisabled", false)
        set(v) = prefs.edit().putBoolean("adminDisabled", v).apply()

    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getEntry(ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return gen.generateKey()
    }

    private fun encrypt(plain: String): String {
        val c = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val body = c.doFinal(plain.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(c.iv, Base64.NO_WRAP) + "." + Base64.encodeToString(body, Base64.NO_WRAP)
    }

    private fun decrypt(sealed: String): String? = try {
        val (iv, body) = sealed.split(".").map { Base64.decode(it, Base64.NO_WRAP) }
        val c = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv)) }
        String(c.doFinal(body), Charsets.UTF_8)
    } catch (e: Exception) {
        null
    }

    companion object {
        private const val KEY_TOKEN = "token"
        private const val ALIAS = "haven-device-token"
    }
}
