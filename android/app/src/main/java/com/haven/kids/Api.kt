package com.haven.kids

import android.content.Context
import android.content.pm.PackageManager
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class ApiException(val status: Int, val code: String) : IOException("HTTP $status $code")

/** The Haven device API (see haven/docs/PHONE_APPS.md). Every call is blocking; run off the main thread. */
class Api(private val context: Context) {
    private val base: String by lazy {
        val info = context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        (info.metaData?.getString("haven.server") ?: "https://havenparents.com").trimEnd('/')
    }

    fun enroll(code: String, name: String, model: String, osVersion: String): JSONObject =
        call("POST", "/api/device/enroll", null, JSONObject().put("code", code).put("platform", "ANDROID").put("name", name).put("model", model).put("osVersion", osVersion))

    fun heartbeat(token: String, body: JSONObject): JSONObject = call("POST", "/api/device/heartbeat", token, body)

    fun requestTime(token: String, appId: String, appName: String, minutes: Int, reason: String): JSONObject =
        call("POST", "/api/device/requests", token, JSONObject().put("appId", appId).put("appName", appName).put("minutes", minutes).put("reason", reason))

    fun myRequests(token: String): JSONObject = call("GET", "/api/device/requests", token, null)

    fun sos(token: String, latitude: Double?, longitude: Double?): JSONObject {
        val body = JSONObject()
        if (latitude != null && longitude != null) body.put("latitude", latitude).put("longitude", longitude)
        return call("POST", "/api/device/sos", token, body)
    }

    fun webCheck(token: String, host: String): JSONObject =
        call("GET", "/api/device/web-check?host=" + URLEncoder.encode(host, "UTF-8"), token, null, timeoutMs = 2500)

    fun blocklist(token: String): JSONObject = call("GET", "/api/device/blocklist", token, null)

    private fun call(method: String, path: String, token: String?, body: JSONObject?, timeoutMs: Int = 15000): JSONObject {
        val conn = URL(base + path).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = timeoutMs
            conn.readTimeout = timeoutMs
            conn.setRequestProperty("accept", "application/json")
            token?.let { conn.setRequestProperty("authorization", "Bearer $it") }
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("content-type", "application/json")
                conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = conn.responseCode
            val stream = if (status in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() } ?: "{}"
            val json = try { JSONObject(text) } catch (e: Exception) { JSONObject() }
            if (status !in 200..299) throw ApiException(status, json.optString("error", "http_$status"))
            return json
        } finally {
            conn.disconnect()
        }
    }
}
