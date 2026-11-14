import * as SMS from 'expo-sms';
import Native from '../../modules/mapsms-native';
import { getSetting, saveMessage } from './db';

export type SendResult = { number: string; ok: boolean; error?: string };

/**
 * Send text to each number.
 * Android native build: direct send via SmsManager (no tap needed).
 * Fallback (iOS / Expo Go): opens system composer.
 */
export async function sendText(numbers: string[], text: string): Promise<SendResult[]> {
  const subId = getSetting<number | null>('simSubscriptionId', null);
  if (Native) {
    const results: SendResult[] = [];
    for (const n of numbers) {
      try {
        await Native.sendSms(n, text, subId);
        saveMessage('out', n, text, Date.now());
        results.push({ number: n, ok: true });
      } catch (e) {
        results.push({ number: n, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return results;
  }
  if (!(await SMS.isAvailableAsync())) {
    return numbers.map((n) => ({ number: n, ok: false, error: 'SMS not available on this device' }));
  }
  const r = await SMS.sendSMSAsync(numbers, text);
  const ok = r.result === 'sent' || r.result === 'unknown';
  if (ok) numbers.forEach((n) => saveMessage('out', n, text, Date.now()));
  return numbers.map((n) => ({ number: n, ok, error: ok ? undefined : 'Cancelled' }));
}
