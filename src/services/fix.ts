export type Fix = {
  lat: number;
  lng: number;
  accuracy: number; // meters
  altitude: number | null;
  timestamp: number; // ms
};

export const TARGET_ACCURACY_M = 20;
export const FIX_TIMEOUT_MS = 15000;
export const MAX_FIX_AGE_MS = 30000;

/** Pick better of two fixes. Stale fixes lose. */
export function betterFix(a: Fix | null, b: Fix, now = Date.now()): Fix {
  if (!a) return b;
  if (now - a.timestamp > MAX_FIX_AGE_MS) return b;
  return b.accuracy <= a.accuracy ? b : a;
}
