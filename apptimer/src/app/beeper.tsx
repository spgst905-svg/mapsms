import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, Label, NumberField, Screen, s } from '../components/ui';
import { formatMs } from '../lib/format';
import { Presets } from '../components/Presets';
import { newId } from '../lib/benchmark';
import { removePreset, upsertPreset } from '../lib/presets';
import { beeperStore, presetStore, settingsStore } from '../lib/settings';
import { soundName, playSound, buzz } from '../lib/sounds';
import { beepsElapsed } from '../lib/timer-engine';
import { useNow } from '../hooks/useNow';
import { colors } from '../theme';

function Awake() {
  useKeepAwake();
  return null;
}

export default function Beeper() {
  const cfg = beeperStore.use();
  const settings = settingsStore.use();
  const presets = presetStore.use();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const now = useNow(startedAt !== null, 50);

  const intervalMs = cfg.intervalSec * 1000;
  const sinceStart = startedAt === null ? 0 : Math.max(0, now - startedAt);
  const inDelay = startedAt !== null && sinceStart < cfg.startDelaySec * 1000;
  const runMs = Math.max(0, sinceStart - cfg.startDelaySec * 1000);
  const count = startedAt === null || inDelay ? 0 : beepsElapsed(runMs, intervalMs, cfg.maxBeeps || Infinity);
  const finished = cfg.maxBeeps > 0 && count >= cfg.maxBeeps;
  const active = startedAt !== null && !finished;

  const fired = useRef(0);
  useEffect(() => {
    if (startedAt !== null && count > fired.current) {
      fired.current = count;
      playSound(settingsStore.get().sounds.beeper);
      buzz();
    }
  }, [count, startedAt]);

  const nextIn = intervalMs - (runMs % intervalMs);

  return (
    <Screen>
      {active && <Awake />}
      <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        {active && (
          <Card>
            <Text style={[s.label, { textAlign: 'center', color: inDelay ? colors.warn : colors.accent }]}>
              {inDelay ? 'Get ready' : 'Beeping'}
            </Text>
            <Text style={s.big}>
              {formatMs(Math.ceil((inDelay ? cfg.startDelaySec * 1000 - sinceStart : nextIn) / 1000) * 1000)}
            </Text>
            <Text style={[s.dim, { textAlign: 'center' }]}>
              Beeps {count}{cfg.maxBeeps ? ` / ${cfg.maxBeeps}` : ''}
            </Text>
            <Button title="Stop" tone="stop" onPress={() => {
              setStartedAt(null);
            }} />
          </Card>
        )}
        {!active && (
          <>
            <Card>
              <Label>Beep every</Label>
              <View style={s.between}>
                <Text style={s.text}>Interval</Text>
                <NumberField value={cfg.intervalSec} min={1} max={86400} suffix="sec" onChange={(n) => beeperStore.set({ intervalSec: n })} />
              </View>
              <View style={s.between}>
                <Text style={s.text}>Stop after</Text>
                <NumberField value={cfg.maxBeeps} max={9999} suffix="beeps (0 = ∞)" width={72} onChange={(n) => beeperStore.set({ maxBeeps: n })} />
              </View>
              <View style={s.between}>
                <Text style={s.text}>Start delay</Text>
                <NumberField value={cfg.startDelaySec} max={3600} suffix="sec" onChange={(n) => beeperStore.set({ startDelaySec: n })} />
              </View>
              <Text style={s.dim}>Sound: {soundName(settings.sounds.beeper)} (change in Sounds tab)</Text>
            </Card>
            <Button title="Start" tone="go" onPress={() => {
                fired.current = 0;
                setStartedAt(Date.now());
              }} />
            <Presets
              title="Saved beepers"
              presets={presets.beeper}
              onSave={(name) => presetStore.set((p) => ({ beeper: upsertPreset(p.beeper, name, beeperStore.get(), newId('p')) }))}
              onLoad={(p) => beeperStore.set({ ...p.config })}
              onDelete={(id) => presetStore.set((p) => ({ beeper: removePreset(p.beeper, id) }))}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
