/** Philippine mobile number helpers. Pure. */

/** Normalize to +639XXXXXXXXX. Returns null if not a valid PH mobile. */
export function normalizePH(input: string): string | null {
  const d = input.replace(/[^\d+]/g, '');
  let m: RegExpMatchArray | null;
  if ((m = d.match(/^\+?639(\d{9})$/))) return `+639${m[1]}`;
  if ((m = d.match(/^09(\d{9})$/))) return `+639${m[1]}`;
  if ((m = d.match(/^9(\d{9})$/))) return `+639${m[1]}`;
  return null;
}

/** Same subscriber? Compares last 10 digits (handles 09xx vs +639xx). */
export function sameNumber(a: string, b: string): boolean {
  const ta = a.replace(/\D/g, '').slice(-10);
  const tb = b.replace(/\D/g, '').slice(-10);
  return ta.length >= 7 && ta === tb;
}

/** Display: 0917 123 4567 */
export function formatPH(n: string): string {
  const norm = normalizePH(n);
  if (!norm) return n;
  const local = '0' + norm.slice(3);
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}
