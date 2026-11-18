# App Timer

Expo SDK 58 app, separate from MapSMS (own `package.json`, own lockfile).

## Features
- **Timer**: customizable duration, start delay after pressing Start, chained steps, rest between steps, repeat.
- **Stopwatch** and **Laps** (split, total, best/worst highlight).
- **Beeper**: sound every N seconds, optional beep limit and start delay.
- **Saved setups**: name and save timer chains and beeper configs, load or delete later. Everything persists on device.
- **Bench**: task benchmark. Add tasks and people, time runs (or type a time), per-task leaderboard by best or average, median, spread, trend, personal-best notice, per-person history, recent-runs bars.
- **Sounds**: pick a sound per event. Bundled sounds on all platforms. Android also lists `/system/media/audio/*`. iOS exposes no system sound library.

## Run
```bash
cd apptimer
npm install
npm test            # engine + stopwatch unit tests
npm run typecheck
npm run lint
npx expo start
```

## Notes
- Timing uses wall-clock timestamps, no drift.
- Foreground only: screen stays awake while running. No background alarms yet.
- Regenerate bundled sounds: `npm run sounds`.

## CI
`.github/workflows/apptimer-apk.yml` (separate from MapSMS): typecheck, lint, tests on PRs; release APK on manual run or tag `apptimer-v*`.
