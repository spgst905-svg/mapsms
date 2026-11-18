export type Step = { id: string; label: string; durationSec: number };

export type TimerConfig = {
  /** Countdown after pressing Start, before the first step. 0 = none. */
  startDelaySec: number;
  /** Chained steps, run in order. */
  steps: Step[];
  /** Number of times the whole chain runs. */
  repeat: number;
  /** Pause between consecutive steps. 0 = none. */
  gapSec: number;
};

export type Phase =
  | { kind: 'delay'; durationMs: number; label: string }
  | { kind: 'step'; durationMs: number; label: string; stepIndex: number; round: number }
  | { kind: 'gap'; durationMs: number; label: string };

export function buildPhases(cfg: TimerConfig): Phase[] {
  const phases: Phase[] = [];
  if (cfg.startDelaySec > 0) {
    phases.push({ kind: 'delay', durationMs: cfg.startDelaySec * 1000, label: 'Get ready' });
  }
  const steps = cfg.steps.filter((s) => s.durationSec > 0);
  const rounds = Math.max(1, cfg.repeat);
  for (let round = 0; round < rounds; round++) {
    steps.forEach((s, i) => {
      const last = round === rounds - 1 && i === steps.length - 1;
      phases.push({ kind: 'step', durationMs: s.durationSec * 1000, label: s.label, stepIndex: i, round });
      if (cfg.gapSec > 0 && !last) {
        phases.push({ kind: 'gap', durationMs: cfg.gapSec * 1000, label: 'Rest' });
      }
    });
  }
  return phases;
}

export type Position =
  | { done: false; index: number; phase: Phase; remainingMs: number; phaseElapsedMs: number }
  | { done: true; index: number };

/** Where are we after `elapsedMs` of running time? */
export function locate(phases: Phase[], elapsedMs: number): Position {
  let t = Math.max(0, elapsedMs);
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    if (t < p.durationMs) {
      return { done: false, index: i, phase: p, remainingMs: p.durationMs - t, phaseElapsedMs: t };
    }
    t -= p.durationMs;
  }
  return { done: true, index: phases.length };
}

export function totalMs(phases: Phase[]): number {
  return phases.reduce((a, p) => a + p.durationMs, 0);
}

/** How many beeps have fired after `elapsedMs` for a given interval (first beep at t = interval). */
export function beepsElapsed(elapsedMs: number, intervalMs: number, maxBeeps = Infinity): number {
  if (intervalMs <= 0) return 0;
  return Math.min(maxBeeps, Math.floor(elapsedMs / intervalMs));
}
