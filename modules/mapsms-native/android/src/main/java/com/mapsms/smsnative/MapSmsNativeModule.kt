package com.mapsms.smsnative

import android.app.Activity
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.provider.Telephony
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.lang.ref.WeakReference
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread

class MapSmsNativeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  companion object {
    private var instance: WeakReference<MapSmsNativeModule>? = null
    private val reqCounter = AtomicInteger(1000)
    private val downloads = java.util.concurrent.ConcurrentHashMap<String, Boolean>() // id -> cancelled

    fun emitIncoming(address: String, body: String, date: Long) {
      Handler(Looper.getMainLooper()).post {
        instance?.get()?.sendEvent(
          "onSmsReceived",
          mapOf("address" to address, "body" to body, "date" to date.toDouble())
        )
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("MapSmsNative")
    Events("onSmsReceived", "onDownloadProgress")

    OnCreate {
      instance = WeakReference(this@MapSmsNativeModule)
      appContext.reactContext?.let { SosAlert.ensureChannels(it) }
    }

    OnDestroy {
      if (instance?.get() === this@MapSmsNativeModule) instance = null
    }

    // ---------- SMS send ----------
    AsyncFunction("sendSms") { number: String, text: String, subscriptionId: Int?, promise: Promise ->
      val ctx = context
      val sm: SmsManager = try {
        val base = ctx.getSystemService(SmsManager::class.java)
        if (subscriptionId != null && subscriptionId >= 0) base.createForSubscriptionId(subscriptionId) else base
      } catch (e: Exception) {
        promise.reject("ERR_SMS", "SMS not available: ${e.message}", e); return@AsyncFunction
      }
      val parts = sm.divideMessage(text)
      val action = "com.mapsms.SMS_SENT." + reqCounter.incrementAndGet()
      val remaining = AtomicInteger(parts.size)
      var failed: Int? = null
      var settled = false
      val handler = Handler(Looper.getMainLooper())

      val receiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
          if (resultCode != Activity.RESULT_OK) failed = resultCode
          if (remaining.decrementAndGet() == 0 && !settled) {
            settled = true
            try { ctx.unregisterReceiver(this) } catch (_: Exception) {}
            if (failed == null) promise.resolve(true)
            else promise.reject("ERR_SMS_SEND", "Send failed, code $failed (check load / signal)", null)
          }
        }
      }
      ContextCompat.registerReceiver(ctx, receiver, IntentFilter(action), ContextCompat.RECEIVER_NOT_EXPORTED)

      val sentIntents = ArrayList<PendingIntent>()
      for (idx in parts.indices) {
        val intent = Intent(action).setPackage(ctx.packageName)
        sentIntents.add(
          PendingIntent.getBroadcast(ctx, reqCounter.incrementAndGet(), intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_ONE_SHOT)
        )
      }
      try {
        if (parts.size == 1) sm.sendTextMessage(number, null, text, sentIntents[0], null)
        else sm.sendMultipartTextMessage(number, null, parts, sentIntents, null)
      } catch (e: Exception) {
        settled = true
        try { ctx.unregisterReceiver(receiver) } catch (_: Exception) {}
        promise.reject("ERR_SMS_SEND", e.message ?: "send failed", e); return@AsyncFunction
      }
      handler.postDelayed({
        if (!settled) {
          settled = true
          try { ctx.unregisterReceiver(receiver) } catch (_: Exception) {}
          promise.reject("ERR_SMS_TIMEOUT", "No send confirmation after 60s", null)
        }
      }, 60_000)
    }

    // ---------- SIM cards ----------
    Function("getSimCards") { ->
      try {
        val sub = context.getSystemService(SubscriptionManager::class.java)
        (sub.activeSubscriptionInfoList ?: emptyList()).map {
          mapOf(
            "subscriptionId" to it.subscriptionId,
            "slot" to it.simSlotIndex,
            "carrier" to (it.carrierName?.toString() ?: ""),
            "displayName" to (it.displayName?.toString() ?: "")
          )
        }
      } catch (e: SecurityException) {
        emptyList<Map<String, Any>>()
      }
    }

    // ---------- Inbox ----------
    Function("readInbox") { limit: Int ->
      val out = mutableListOf<Map<String, Any>>()
      try {
        context.contentResolver.query(
          Telephony.Sms.Inbox.CONTENT_URI,
          arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
          "${Telephony.Sms.BODY} LIKE ?",
          arrayOf("%MAPSMS%"),
          "${Telephony.Sms.DATE} DESC"
        )?.use { c ->
          while (c.moveToNext() && out.size < limit) {
            out.add(
              mapOf(
                "address" to (c.getString(0) ?: ""),
                "body" to (c.getString(1) ?: ""),
                "date" to c.getLong(2).toDouble()
              )
            )
          }
        }
      } catch (_: SecurityException) {}
      out
    }

    // ---------- Device / settings ----------
    Function("getDeviceStatus") { ->
      val ctx = context
      val pm = ctx.getSystemService(PowerManager::class.java)
      val nm = ctx.getSystemService(NotificationManager::class.java)
      mapOf(
        "ignoringBatteryOptimizations" to pm.isIgnoringBatteryOptimizations(ctx.packageName),
        "canUseFullScreenIntent" to (if (Build.VERSION.SDK_INT >= 34) nm.canUseFullScreenIntent() else true),
        "notificationsEnabled" to nm.areNotificationsEnabled(),
        "sdkInt" to Build.VERSION.SDK_INT,
        "manufacturer" to Build.MANUFACTURER,
        "hasTelephony" to ctx.packageManager.hasSystemFeature("android.hardware.telephony")
      )
    }

    Function("openSettings") { which: String ->
      val ctx = context
      val pkg = Uri.parse("package:${ctx.packageName}")
      val intents = when (which) {
        "battery" -> listOf(
          Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pkg),
          Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
        )
        "autostart" -> listOf(
          Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")),
          Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")),
          Intent().setComponent(ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")),
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
        )
        "fullscreen" -> listOf(
          Intent("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT", pkg),
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
        )
        "notifications" -> listOf(
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
        )
        else -> listOf(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg))
      }
      for (i in intents) {
        try {
          i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          ctx.startActivity(i)
          return@Function true
        } catch (_: Exception) {}
      }
      false
    }

    // ---------- Storage (SD card) ----------
    Function("getStorageDirs") { ->
      context.getExternalFilesDirs(null).filterNotNull().map { f ->
        mapOf(
          "path" to f.absolutePath,
          "removable" to Environment.isExternalStorageRemovable(f),
          "freeBytes" to f.freeSpace.toDouble(),
          "totalBytes" to f.totalSpace.toDouble()
        )
      }
    }

    Function("fileSize") { path: String ->
      val f = File(path); if (f.exists()) f.length().toDouble() else -1.0
    }

    Function("deleteFile") { path: String -> File(path).delete() }

    /** Resumable HTTP download to any path (incl. SD card app dir). Emits onDownloadProgress. */
    AsyncFunction("download") { id: String, url: String, dest: String, promise: Promise ->
      downloads[id] = false
      thread(name = "mapsms-dl-$id") {
        try {
          val target = File(dest)
          target.parentFile?.mkdirs()
          val part = File("$dest.part")
          var have = if (part.exists()) part.length() else 0L
          val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 20_000
            readTimeout = 30_000
            instanceFollowRedirects = true
            if (have > 0) setRequestProperty("Range", "bytes=$have-")
          }
          val code = conn.responseCode
          if (code == 200) have = 0L
          else if (code != 206) throw RuntimeException("HTTP $code")
          val total = have + conn.contentLengthLong.coerceAtLeast(0)
          conn.inputStream.use { input ->
            FileOutputStream(part, have > 0).use { out ->
              val buf = ByteArray(64 * 1024)
              var done = have
              var lastEmit = 0L
              while (true) {
                if (downloads[id] == true) throw InterruptedException("cancelled")
                val n = input.read(buf)
                if (n < 0) break
                out.write(buf, 0, n)
                done += n
                val now = System.currentTimeMillis()
                if (now - lastEmit > 500) {
                  lastEmit = now
                  sendEvent("onDownloadProgress", mapOf("id" to id, "bytes" to done.toDouble(), "total" to total.toDouble()))
                }
              }
              sendEvent("onDownloadProgress", mapOf("id" to id, "bytes" to done.toDouble(), "total" to total.toDouble()))
            }
          }
          if (target.exists()) target.delete()
          if (!part.renameTo(target)) throw RuntimeException("rename failed")
          downloads.remove(id)
          promise.resolve(target.absolutePath)
        } catch (e: InterruptedException) {
          downloads.remove(id)
          promise.reject("ERR_CANCELLED", "Download paused", e)
        } catch (e: Exception) {
          downloads.remove(id)
          promise.reject("ERR_DOWNLOAD", e.message ?: "download failed", e)
        }
      }
    }

    Function("cancelDownload") { id: String ->
      if (downloads.containsKey(id)) downloads[id] = true
    }
  }
}
