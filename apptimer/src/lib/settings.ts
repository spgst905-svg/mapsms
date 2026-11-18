import { createStore } from './store';
import type { TimerConfig } from './timer-engine';
import type { Preset } from './presets';
import type { BenchRecord, Person, Task } from './benchmark';

export type SoundRole = 'stepEnd' | 'delayEnd' | 'finish' | 'beeper';

export type Settings = {
  /** soundId per role. See sounds.ts. */
  sounds: Record<SoundRole, string>;
  vibrate: boolean;
  volume: number;
};

export const settingsStore = createStore<Settings>('settings.v1', {
  sounds: { stepEnd: 'bundled:chime', delayEnd: 'bundled:beep', finish: 'bundled:alarm', beeper: 'bundled:tick' },
  vibrate: true,
  volume: 1,
});

export const defaultTimer: TimerConfig = {
  startDelaySec: 5,
  repeat: 1,
  gapSec: 0,
  steps: [{ id: 's1', label: 'Step 1', durationSec: 60 }],
};

export const timerStore = createStore<TimerConfig>('timer.v1', defaultTimer);

export type BeeperConfig = {
  intervalSec: number;
  /** 0 = until stopped */
  maxBeeps: number;
  startDelaySec: number;
};

export const beeperStore = createStore<BeeperConfig>('beeper.v1', { intervalSec: 10, maxBeeps: 0, startDelaySec: 3 });


export const presetStore = createStore<{ timer: Preset<TimerConfig>[]; beeper: Preset<BeeperConfig>[] }>('presets.v1', {
  timer: [],
  beeper: [],
});

export const benchStore = createStore<{ tasks: Task[]; persons: Person[]; records: BenchRecord[] }>('bench.v1', {
  tasks: [],
  persons: [],
  records: [],
});
