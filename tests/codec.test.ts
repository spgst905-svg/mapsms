import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decode, encode } from '../src/services/codec.ts';
import { betterFix } from '../src/services/fix.ts';

const fix = { lat: 14.599512, lng: 120.984222, accuracy: 7.6, altitude: 10, timestamp: new Date(2026, 0, 1, 14, 32).getTime() };

test('encode format, fits 160', () => {
  const s = encode(fix, { note: 'nasa gate ako' });
  assert.match(s, /^MAPSMS 14\.59951,120\.98422 ±8m 14:32\n/);
  assert.ok(s.length <= 160);
});

test('round trip', () => {
  const d = decode(encode(fix, { sos: true, battery: 23, note: 'help' }))!;
  assert.deepEqual(d, { sos: true, lat: 14.59951, lng: 120.98422, accuracy: 8, time: '14:32', battery: 23, note: 'help' });
});

test('no URL in SMS (carriers block links)', () => {
  const s = encode(fix, { note: 'hi' });
  assert.ok(!/https?:|www\.|maps\.google/i.test(s), s);
  assert.equal(s, 'MAPSMS 14.59951,120.98422 ±8m 14:32\nhi');
});

test('decode old format with link', () => {
  const d = decode('MAPSMS 14.59951,120.98422 ±8m 14:32\nhttps://maps.google.com/?q=14.59951,120.98422\nnasa gate')!;
  assert.equal(d.note, 'nasa gate');
});

test('decode rejects junk', () => {
  assert.equal(decode('hello'), null);
  assert.equal(decode('MAPSMS 99.0,10.0'), null);
});

test('betterFix prefers accurate, drops stale', () => {
  const now = fix.timestamp;
  assert.equal(betterFix({ ...fix, accuracy: 30 }, fix, now), fix);
  const worse = { ...fix, accuracy: 50 };
  assert.equal(betterFix(fix, worse, now).accuracy, 7.6);
  assert.equal(betterFix({ ...fix, timestamp: now - 60000 }, worse, now), worse);
});
