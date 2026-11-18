/** Format milliseconds as mm:ss (or h:mm:ss), optionally with centiseconds. */
export function formatMs(ms: number, centis = false): string {
  const total = Math.max(0, Math.floor(ms));
  const cs = Math.floor((total % 1000) / 10);
  const s = Math.floor(total / 1000) % 60;
  const m = Math.floor(total / 60000) % 60;
  const h = Math.floor(total / 3600000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return centis ? `${base}.${pad(cs)}` : base;
}

/** Clamp a user-typed integer into [min, max]; NaN -> min. */
export function clampInt(value: string | number, min: number, max: number): number {
  const n = typeof value === 'number' ? Math.floor(value) : parseInt(value, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
