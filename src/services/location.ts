import * as Location from 'expo-location';

import { betterFix, FIX_TIMEOUT_MS, TARGET_ACCURACY_M, type Fix } from './fix';

export type { Fix };

export async function ensurePermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

function toFix(l: Location.LocationObject): Fix {
  return {
    lat: l.coords.latitude,
    lng: l.coords.longitude,
    accuracy: l.coords.accuracy ?? Infinity,
    altitude: l.coords.altitude,
    timestamp: l.timestamp,
  };
}

/**
 * Watch GPS, report each improvement via onUpdate.
 * Resolves with best fix when accuracy <= target or timeout.
 */
export async function getBestFix(
  onUpdate: (fix: Fix) => void,
  target = TARGET_ACCURACY_M,
  timeoutMs = FIX_TIMEOUT_MS,
): Promise<Fix | null> {
  let best: Fix | null = null;
  return new Promise(async (resolve) => {
    let sub: Location.LocationSubscription | null = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      sub?.remove();
      resolve(best);
    };
    const timer = setTimeout(finish, timeoutMs);
    try {
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (l) => {
          best = betterFix(best, toFix(l));
          onUpdate(best);
          if (best.accuracy <= target) finish();
        },
      );
      if (done) sub.remove();
    } catch {
      finish();
    }
  });
}
