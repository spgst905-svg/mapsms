import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPhases, locate, totalMs, beepsElapsed, type TimerConfig } from '../src/lib/timer-engine.ts';
import * as sw from '../src/lib/stopwatch.ts';
import { formatMs, clampInt } from '../src/lib/format.ts';

const cfg: TimerConfig = {
  startDelaySec: 5,
  repeat: 2,
  gapSec: 2,
  steps: [
    { id: 'a', label: 'Work', durationSec: 10 },
    { id: 'b', label: 'Cool', durationSec: 4 },
  ],
};

test('buildPhases: delay, chained steps, gaps, repeat; no trailing gap', () => {
  const p = buildPhases(cfg);
  assert.deepEqual(
    p.map((x) => x.kind),
    ['delay', 'step', 'gap', 'step', 'gap', 'step', 'gap', 'step'],
  );
  assert.equal(totalMs(p), (5 + 10 + 2 + 4 + 2 + 10 + 2 + 4) * 1000);
});

test('buildPhases: skips zero-length steps and zero delay', () => {
  const p = buildPhases({ startDelaySec: 0, repeat: 1, gapSec: 0, steps: [{ id: 'x', label: 'x', durationSec: 0 }] });
  assert.equal(p.length, 0);
});

test('locate walks phases and reports done', () => {
  const p = buildPhases(cfg);
  const a = locate(p, 0);
  assert.ok(!a.done && a.phase.kind === 'delay' && a.remainingMs === 5000);
  const b = locate(p, 5000);
  assert.ok(!b.done && b.phase.kind === 'step' && b.index === 1);
  const c = locate(p, 16500);
  assert.ok(!c.done && c.phase.kind === 'gap' && c.remainingMs === 500);
  assert.ok(locate(p, totalMs(p)).done);
});

test('beepsElapsed', () => {
  assert.equal(beepsElapsed(999, 1000), 0);
  assert.equal(beepsElapsed(3000, 1000), 3);
  assert.equal(beepsElapsed(9000, 1000, 5), 5);
  assert.equal(beepsElapsed(9000, 0), 0);
});

test('stopwatch start/stop/resume/reset', () => {
  let s = sw.start(sw.initialStopwatch, 1000);
  assert.equal(sw.elapsedMs(s, 1500), 500);
  s = sw.stop(s, 2000);
  assert.equal(sw.elapsedMs(s, 9999), 1000);
  s = sw.start(s, 5000);
  assert.equal(sw.elapsedMs(s, 5500), 1500);
  assert.deepEqual(sw.reset(), sw.initialStopwatch);
});

test('laps record splits, ignore when stopped, mark extremes', () => {
  let s = sw.start(sw.initialStopwatch, 0);
  s = sw.lap(s, 3000);
  s = sw.lap(s, 4000);
  s = sw.lap(s, 9000);
  assert.deepEqual(s.laps.map((l) => l.splitMs), [5000, 1000, 3000]);
  assert.deepEqual(sw.lapExtremes(s.laps), { best: 2, worst: 3 });
  const stopped = sw.stop(s, 10000);
  assert.equal(sw.lap(stopped, 11000).laps.length, 3);
});

test('format helpers', () => {
  assert.equal(formatMs(65000), '01:05');
  assert.equal(formatMs(3725000), '1:02:05');
  assert.equal(formatMs(1234, true), '00:01.23');
  assert.equal(clampInt('abc', 0, 59), 0);
  assert.equal(clampInt('75', 0, 59), 59);
});
