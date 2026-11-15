import type { Fix } from './fix';

export type Decoded = {
  sos: boolean;
  lat: number;
  lng: number;
  accuracy: number | null;
  time: string | null;
  battery: number | null;
  note: string | null;
};

const pad = (n: number) => String(n).padStart(2, '0');

export function encode(fix: Fix, opts: { sos?: boolean; battery?: number; note?: string } = {}): string {
  const d = new Date(fix.timestamp);
  const lat = fix.lat.toFixed(5);
  const lng = fix.lng.toFixed(5);
  const parts = ['MAPSMS'];
  if (opts.sos) parts.push('SOS');
  parts.push(`${lat},${lng}`, `±${Math.round(fix.accuracy)}m`, `${pad(d.getHours())}:${pad(d.getMinutes())}`);
  if (opts.battery != null) parts.push(`BAT ${Math.round(opts.battery)}%`);
  // No URL: PH carriers (Globe/Smart) block person-to-person SMS containing links.
  let msg = parts.join(' ');
  if (opts.note) msg += `\n${opts.note}`;
  return msg.slice(0, 160);
}

const RE =
  /MAPSMS(\s+SOS)?\s+(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)(?:\s+±(\d+)m)?(?:\s+(\d{2}:\d{2}))?(?:\s+BAT\s+(\d{1,3})%)?/;

export function decode(text: string): Decoded | null {
  const m = RE.exec(text);
  if (!m) return null;
  const lat = parseFloat(m[2]);
  const lng = parseFloat(m[3]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // Note = lines after header; skip map links from older app versions.
  const note =
    text
      .split('\n')
      .slice(1)
      .filter((l) => !/^https?:\/\//i.test(l.trim()))
      .join('\n')
      .trim() || null;
  return {
    sos: !!m[1],
    lat,
    lng,
    accuracy: m[4] ? parseInt(m[4], 10) : null,
    time: m[5] ?? null,
    battery: m[6] ? parseInt(m[6], 10) : null,
    note,
  };
}
