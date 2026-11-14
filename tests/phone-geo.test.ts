import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bearingDeg, compassDir, distanceM, formatDistance } from '../src/services/geo.ts';
import { formatPH, normalizePH, sameNumber } from '../src/services/phone.ts';

test('normalizePH accepts PH mobile formats', () => {
  for (const s of ['09171234567', '0917 123 4567', '+639171234567', '639171234567', '9171234567', '0917-123-4567']) {
    assert.equal(normalizePH(s), '+639171234567', s);
  }
});

test('normalizePH rejects non-mobile', () => {
  for (const s of ['', '1234', '0281234567', '+15551234567', '091712345678']) assert.equal(normalizePH(s), null, s);
});

test('sameNumber + formatPH', () => {
  assert.ok(sameNumber('09171234567', '+639171234567'));
  assert.ok(!sameNumber('09171234567', '09181234567'));
  assert.equal(formatPH('+639171234567'), '0917 123 4567');
});

test('distance Manila City Hall -> Makati ~ 6 km', () => {
  const d = distanceM(14.5896, 120.9811, 14.5547, 121.0244);
  assert.ok(d > 5000 && d < 6500, String(d));
  assert.equal(formatDistance(850), '850 m');
  assert.equal(formatDistance(5934), '5.93 km');
});

test('bearing cardinal', () => {
  assert.equal(Math.round(bearingDeg(14, 121, 15, 121)), 0);
  assert.equal(Math.round(bearingDeg(14, 121, 14, 122)), 90);
  assert.equal(compassDir(bearingDeg(14.5896, 120.9811, 14.5547, 121.0244)), 'SE');
});
