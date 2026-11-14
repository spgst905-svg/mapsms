import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { encode } from './codec';
import { emergencyContacts, getSetting, setSetting } from './db';
import { betterFix, type Fix } from './fix';
import { getBestFix } from './location';
import { sendText } from './sms';

export const SOS_TASK = 'mapsms-sos-location';
export const DEFAULT_SOS_INTERVAL_MIN = 5;

type SosState = { active: boolean; startedAt: number; lastSent: number; lastAccuracy: number | null };
const IDLE: SosState = { active: false, startedAt: 0, lastSent: 0, lastAccuracy: null };

export const getSosState = () => getSetting<SosState>('sos.state', IDLE);
const setSosState = (s: SosState) => setSetting('sos.state', s);
export const getSosInterval = () => getSetting<number>('sos.intervalMin', DEFAULT_SOS_INTERVAL_MIN);
export const setSosInterval = (m: number) => setSetting('sos.intervalMin', m);

async function batteryPct(): Promise<number | undefined> {
  try {
    const l = await Battery.getBatteryLevelAsync();
    return l >= 0 ? l * 100 : undefined;
  } catch {
    return undefined;
  }
}

async function sendSos(fix: Fix): Promise<number> {
  const numbers = emergencyContacts().map((c) => c.number);
  if (!numbers.length) return 0;
  const text = encode(fix, { sos: true, battery: await batteryPct(), note: 'SOS! Need help.' });
  const res = await sendText(numbers, text);
  const s = getSosState();
  setSosState({ ...s, lastSent: Date.now(), lastAccuracy: fix.accuracy });
  return res.filter((r) => r.ok).length;
}

const toFix = (l: Location.LocationObject): Fix => ({
  lat: l.coords.latitude,
  lng: l.coords.longitude,
  accuracy: l.coords.accuracy ?? 9999,
  altitude: l.coords.altitude,
  timestamp: l.timestamp,
});

/** Background task: runs in foreground service even with screen off. Must be defined at module top level. */
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(SOS_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const s = getSosState();
  if (!s.active) {
    await Location.stopLocationUpdatesAsync(SOS_TASK).catch(() => {});
    return;
  }
  let best: Fix | null = null;
  for (const l of data.locations) best = betterFix(best, toFix(l));
  if (!best) return;
  const due = Date.now() - s.lastSent >= getSosInterval() * 60_000;
  // Also send early if accuracy dramatically improved since last SOS (e.g. 200m -> 15m).
  const muchBetter = s.lastAccuracy != null && best.accuracy * 3 < s.lastAccuracy && best.accuracy <= 30;
  if (due || muchBetter) await sendSos(best);
});

export type SosStartResult = { sentTo: number; contacts: number; error?: string };

/**
 * 1. Send fast fix immediately (last known / any accuracy).
 * 2. Start foreground service; repeats every N minutes.
 * 3. Refine: send better fix once GPS settles.
 */
export async function startSos(): Promise<SosStartResult> {
  const contacts = emergencyContacts().length;
  if (!contacts) return { sentTo: 0, contacts, error: 'No emergency contacts. Add in Settings → Contacts.' };

  setSosState({ active: true, startedAt: Date.now(), lastSent: 0, lastAccuracy: null });

  let quick: Fix | null = null;
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 120_000 });
    if (last) quick = toFix(last);
    if (!quick) quick = toFix(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
  } catch {
    /* no fix yet */
  }
  const sentTo = quick ? await sendSos(quick) : 0;

  try {
    await Location.startLocationUpdatesAsync(SOS_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 30_000,
      distanceInterval: 0,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: '🚨 MapSMS SOS active',
        notificationBody: `Sending location every ${getSosInterval()} min. Open app to stop.`,
        notificationColor: '#c62828',
        killServiceOnDestroy: false,
      },
    });
  } catch (e) {
    return { sentTo, contacts, error: 'Background location blocked: ' + (e instanceof Error ? e.message : String(e)) };
  }

  // Refine in foreground.
  getBestFix(() => {}, 20, 20_000).then((fine) => {
    const s = getSosState();
    if (fine && s.active && (s.lastAccuracy == null || fine.accuracy * 2 < s.lastAccuracy)) sendSos(fine);
  });

  return { sentTo, contacts };
}

export async function stopSos(sendSafe: boolean): Promise<void> {
  setSosState(IDLE);
  if (await TaskManager.isTaskRegisteredAsync(SOS_TASK)) {
    await Location.stopLocationUpdatesAsync(SOS_TASK).catch(() => {});
  }
  if (sendSafe) {
    const numbers = emergencyContacts().map((c) => c.number);
    if (numbers.length) await sendText(numbers, "MapSMS: I'm safe now. SOS cancelled.");
  }
}
