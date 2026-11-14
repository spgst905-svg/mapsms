package com.mapsms.smsnative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

/** Static receiver: fires even when app closed. Forwards MAPSMS texts to JS, raises SOS alarm. */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    if (parts.isEmpty()) return
    val address = parts[0].originatingAddress ?: ""
    val body = parts.joinToString("") { it.messageBody ?: "" }
    val date = parts[0].timestampMillis
    if (!body.contains("MAPSMS")) return

    MapSmsNativeModule.emitIncoming(address, body, date)

    if (body.contains("MAPSMS SOS")) {
      SosAlert.show(context, address, body)
    }
  }
}
