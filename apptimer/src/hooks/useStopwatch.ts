import { useState } from 'react';
import * as sw from '../lib/stopwatch';
import { useNow } from './useNow';

export function useStopwatch() {
  const [state, setState] = useState<sw.StopwatchState>(sw.initialStopwatch);
  const running = state.startedAt !== null;
  const now = useNow(running, 33);
  return {
    state,
    running,
    elapsed: sw.elapsedMs(state, now),
    start: () => setState((s) => sw.start(s, Date.now())),
    stop: () => setState((s) => sw.stop(s, Date.now())),
    reset: () => setState(sw.reset()),
    lap: () => setState((s) => sw.lap(s, Date.now())),
  };
}
