package com.mapsms.smsnative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat

object SosAlert {
  const val CHANNEL_ID = "mapsms_sos"
  const val CHANNEL_LOC = "mapsms_location"

  fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = context.getSystemService(NotificationManager::class.java)
    if (nm.getNotificationChannel(CHANNEL_ID) == null) {
      val sos = NotificationChannel(CHANNEL_ID, "SOS alerts", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Emergency location received"
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 800, 400, 800, 400, 800)
        setBypassDnd(true)
        setSound(
          RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
      }
      nm.createNotificationChannel(sos)
    }
    if (nm.getNotificationChannel(CHANNEL_LOC) == null) {
      nm.createNotificationChannel(
        NotificationChannel(CHANNEL_LOC, "Location received", NotificationManager.IMPORTANCE_DEFAULT)
      )
    }
  }

  fun show(context: Context, address: String, body: String) {
    ensureChannels(context)
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse("mapsms://inbox?sos=1")
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    } ?: return
    val pi = PendingIntent.getActivity(
      context, address.hashCode(), launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val n = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_alert)
      .setContentTitle("🚨 SOS from $address")
      .setContentText(body.lineSequence().firstOrNull() ?: body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setContentIntent(pi)
      .setFullScreenIntent(pi, true)
      .setAutoCancel(true)
      .setOngoing(false)
      .build()
    n.flags = n.flags or android.app.Notification.FLAG_INSISTENT
    try {
      context.getSystemService(NotificationManager::class.java).notify(address.hashCode(), n)
    } catch (_: SecurityException) {
      // notification permission missing
    }
  }
}
