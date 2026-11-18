import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPhases, locate, type Phase, type TimerConfig } from '../lib/timer-engine';
import { fire } from '../lib/sounds';
import { useNow } from './useNow';

type RunState = { startedAt: number | null; accumulatedMs: number; active: boolean };
const idle: RunState = { startedAt: null, accumulatedMs: 0, active: false };

function soundFor(prev: Phase | undefined, next: Phase | undefined) {
  if (!next) return 'finish' as const;
  if (prev?.kind === 'delay') return 'delayEnd' as const;
  return 'stepEnd' as const;
}

/** Runs a chained timer from `cfg`. Wall-clock based so it never drifts. */
export function useTimerRun(cfg: TimerConfig) {
  const phases = useMemo(() => buildPhases(cfg), [cfg]);
  const [run, setRun] = useState<RunState>(idle);
  const now = useNow(run.startedAt !== null, 50);
  const elapsed = run.accumulatedMs + (run.startedAt === null ? 0 : Math.max(0, now - run.startedAt));
  const pos = locate(phases, elapsed);
  const running = run.startedAt !== null && !pos.done;
  const lastIndex = useRef(0);

  // Fire a sound whenever we cross into a new phase (or finish).
  const posIndex = pos.index;
  useEffect(() => {
    if (!run.active) return;
    if (posIndex > lastIndex.current) {
      fire(soundFor(phases[posIndex - 1], phases[posIndex]));
      lastIndex.current = posIndex;
    }
  }, [posIndex, run.active, phases]);

  return {
    phases,
    pos,
    elapsed,
    running,
    active: run.active,
    paused: run.active && run.startedAt === null,
    finished: run.active && pos.done,
    start: () => {
      if (!phases.length) return;
      lastIndex.current = 0;
      setRun({ startedAt: Date.now(), accumulatedMs: 0, active: true });
    },
    pause: () =>
      setRun((r) =>
        r.startedAt === null ? r : { ...r, startedAt: null, accumulatedMs: r.accumulatedMs + Date.now() - r.startedAt },
      ),
    resume: () => setRun((r) => (r.startedAt === null && r.active ? { ...r, startedAt: Date.now() } : r)),
    reset: () => setRun(idle),
  };
}
