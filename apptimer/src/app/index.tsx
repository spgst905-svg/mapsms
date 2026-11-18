import { useKeepAwake } from 'expo-keep-awake';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, DurationField, Label, NumberField, Screen, s } from '../components/ui';
import { formatMs } from '../lib/format';
import { Presets } from '../components/Presets';
import { newId } from '../lib/benchmark';
import { removePreset, upsertPreset } from '../lib/presets';
import { presetStore, timerStore } from '../lib/settings';
import { totalMs, type Step } from '../lib/timer-engine';
import { useTimerRun } from '../hooks/useTimerRun';
import { colors } from '../theme';

function Awake() {
  useKeepAwake();
  return null;
}

let nextId = Date.now();
const newStep = (n: number): Step => ({ id: `s${nextId++}`, label: `Step ${n}`, durationSec: 60 });

export default function TimerScreen() {
  const cfg = timerStore.use();
  const presets = presetStore.use();
  const run = useTimerRun(cfg);
  const editing = !run.active;

  const setStep = (id: string, patch: Partial<Step>) =>
    timerStore.set((c) => ({ steps: c.steps.map((st) => (st.id === id ? { ...st, ...patch } : st)) }));

  return (
    <Screen>
      {run.running && <Awake />}
      <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        {run.active ? <RunView run={run} /> : null}

        {editing && (
          <>
            <Card>
              <Label>After pressing start</Label>
              <View style={s.between}>
                <Text style={s.text}>Start delay</Text>
                <NumberField value={cfg.startDelaySec} max={3600} suffix="sec" onChange={(n) => timerStore.set({ startDelaySec: n })} />
              </View>
            </Card>

            <Card>
              <Label>Chained steps</Label>
              {cfg.steps.map((st, i) => (
                <View key={st.id} style={{ gap: 8 }}>
                  <View style={s.row}>
                    <TextInput
                      value={st.label}
                      onChangeText={(t) => setStep(st.id, { label: t })}
                      style={s.textInput}
                      placeholder={`Step ${i + 1}`}
                      placeholderTextColor={colors.dim}
                    />
                    {cfg.steps.length > 1 && (
                      <Button small tone="ghost" title="✕" onPress={() => timerStore.set((c) => ({ steps: c.steps.filter((x) => x.id !== st.id) }))} />
                    )}
                  </View>
                  <DurationField valueSec={st.durationSec} onChange={(sec) => setStep(st.id, { durationSec: sec })} />
                </View>
              ))}
              <Button small tone="ghost" title="+ Add step" onPress={() => timerStore.set((c) => ({ steps: [...c.steps, newStep(c.steps.length + 1)] }))} />
            </Card>

            <Card>
              <Label>Options</Label>
              <View style={s.between}>
                <Text style={s.text}>Rest between steps</Text>
                <NumberField value={cfg.gapSec} max={3600} suffix="sec" onChange={(n) => timerStore.set({ gapSec: n })} />
              </View>
              <View style={s.between}>
                <Text style={s.text}>Repeat chain</Text>
                <NumberField value={cfg.repeat} min={1} max={99} suffix="×" onChange={(n) => timerStore.set({ repeat: n })} />
              </View>
              <Text style={s.dim}>Total {formatMs(totalMs(run.phases))}</Text>
            </Card>

            <Button title="Start" tone="go" onPress={run.start} disabled={run.phases.length === 0} />

            <Presets
              title="Saved timers"
              presets={presets.timer}
              onSave={(name) => presetStore.set((p) => ({ timer: upsertPreset(p.timer, name, timerStore.get(), newId('p')) }))}
              onLoad={(p) => timerStore.set(JSON.parse(JSON.stringify(p.config)))}
              onDelete={(id) => presetStore.set((p) => ({ timer: removePreset(p.timer, id) }))}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function RunView({ run }: { run: ReturnType<typeof useTimerRun> }) {
  const { pos } = run;
  const label = pos.done ? 'Done' : pos.phase.label;
  const remaining = pos.done ? 0 : pos.remainingMs;
  const progress = pos.done ? 1 : pos.phaseElapsedMs / pos.phase.durationMs;
  const tone = pos.done ? colors.go : pos.phase.kind === 'step' ? colors.accent : colors.warn;
  return (
    <Card style={{ alignItems: 'stretch' }}>
      <Text style={[s.label, { textAlign: 'center', color: tone }]}>{label}</Text>
      <Text style={s.big} accessibilityLabel={`${formatMs(Math.ceil(remaining / 1000) * 1000)} remaining`}>
        {formatMs(Math.ceil(remaining / 1000) * 1000)}
      </Text>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${Math.min(100, progress * 100)}%`, backgroundColor: tone }} />
      </View>
      {!pos.done && <Text style={[s.dim, { textAlign: 'center' }]}>Phase {pos.index + 1} of {run.phases.length}</Text>}
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Button title={run.finished ? 'Close' : 'Cancel'} tone="ghost" onPress={run.reset} />
        </View>
        {!run.finished && (
          <View style={{ flex: 1 }}>
            {run.running ? <Button title="Pause" tone="warn" onPress={run.pause} /> : <Button title="Resume" tone="go" onPress={run.resume} />}
          </View>
        )}
      </View>
    </Card>
  );
}
