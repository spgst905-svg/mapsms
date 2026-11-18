export type Lap = { n: number; splitMs: number; totalMs: number };

export type StopwatchState = {
  /** Timestamp when last started; null when stopped. */
  startedAt: number | null;
  /** Elapsed before the current run. */
  accumulatedMs: number;
  laps: Lap[];
};

export const initialStopwatch: StopwatchState = { startedAt: null, accumulatedMs: 0, laps: [] };

export function elapsedMs(s: StopwatchState, now: number): number {
  return s.accumulatedMs + (s.startedAt === null ? 0 : Math.max(0, now - s.startedAt));
}

export function start(s: StopwatchState, now: number): StopwatchState {
  return s.startedAt === null ? { ...s, startedAt: now } : s;
}

export function stop(s: StopwatchState, now: number): StopwatchState {
  if (s.startedAt === null) return s;
  return { ...s, startedAt: null, accumulatedMs: elapsedMs(s, now) };
}

export function reset(): StopwatchState {
  return initialStopwatch;
}

/** Record a lap (only while running). Newest lap is first. */
export function lap(s: StopwatchState, now: number): StopwatchState {
  if (s.startedAt === null) return s;
  const total = elapsedMs(s, now);
  const prevTotal = s.laps.length ? s.laps[0].totalMs : 0;
  return { ...s, laps: [{ n: s.laps.length + 1, splitMs: total - prevTotal, totalMs: total }, ...s.laps] };
}

/** Fastest / slowest split numbers (only meaningful with >= 2 laps). */
export function lapExtremes(laps: Lap[]): { best?: number; worst?: number } {
  if (laps.length < 2) return {};
  let best = laps[0];
  let worst = laps[0];
  for (const l of laps) {
    if (l.splitMs < best.splitMs) best = l;
    if (l.splitMs > worst.splitMs) worst = l;
  }
  return { best: best.n, worst: worst.n };
}
