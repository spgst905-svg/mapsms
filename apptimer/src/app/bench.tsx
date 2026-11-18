import { useKeepAwake } from 'expo-keep-awake';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, DurationField, Label, Screen, s } from '../components/ui';
import {
  history, isPersonalBest, leaderboard, newId, removePerson, removeTask, taskSummary,
  type BenchRecord, type SortKey,
} from '../lib/benchmark';
import { formatMs } from '../lib/format';
import { benchStore } from '../lib/settings';
import * as sw from '../lib/stopwatch';
import { useNow } from '../hooks/useNow';
import { colors } from '../theme';

function Awake() {
  useKeepAwake();
  return null;
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: on ? colors.accent : colors.border,
        backgroundColor: on ? colors.accent : 'transparent',
      }}
    >
      <Text style={{ color: colors.text, fontWeight: on ? '700' : '400' }}>{label}</Text>
    </Pressable>
  );
}

function AddField({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => void }) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  };
  return (
    <View style={s.row}>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        placeholder={placeholder}
        placeholderTextColor={colors.dim}
        style={s.textInput}
      />
      <Button small title="Add" onPress={submit} disabled={!text.trim()} />
    </View>
  );
}

const makeRecord = (taskId: string, personId: string, ms: number): BenchRecord => ({
  id: newId('r'),
  taskId,
  personId,
  ms,
  at: Date.now(),
});

const when = (at: number) => new Date(at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Bench() {
  const { tasks, persons, records } = benchStore.use();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('best');
  const [watch, setWatch] = useState<sw.StopwatchState>(sw.initialStopwatch);
  const [manual, setManual] = useState(0);
  const [msgState, setMsgState] = useState({ key: '', text: '' });

  // Keep selections valid when tasks/persons are added or removed.
  const task = tasks.find((t) => t.id === taskId) ?? tasks[0] ?? null;
  const person = persons.find((p) => p.id === personId) ?? persons[0] ?? null;
  const msgKey = `${task?.id}|${person?.id}`;
  const msg = msgState.key === msgKey ? msgState.text : '';

  const running = watch.startedAt !== null;
  const now = useNow(running, 33);
  const elapsed = sw.elapsedMs(watch, now);
  const canRecord = !!task && !!person;

  const save = (ms: number) => {
    if (!task || !person || ms <= 0) return;
    const rec = makeRecord(task.id, person.id, ms);
    const pb = isPersonalBest(records, rec) && records.some((r) => r.taskId === task.id && r.personId === person.id);
    benchStore.set((b) => ({ records: [...b.records, rec] }));
    setMsgState({ key: msgKey, text: `${person.name}: ${formatMs(ms, true)}${pb ? ' · new personal best!' : ''}` });
  };

  const board = task ? leaderboard(records, persons, task.id, sortBy) : [];
  const summary = task ? taskSummary(records, task.id) : null;
  const slowest = board.reduce((m, r) => Math.max(m, r.stats[sortBy]), 0);
  const runs = task ? history(records, task.id, person?.id) : [];
  const recent = runs.slice(0, 12).reverse();
  const recentMax = recent.reduce((m, r) => Math.max(m, r.ms), 1);

  return (
    <Screen>
      {running && <Awake />}
      <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        <Card>
          <Label>Task</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tasks.map((t) => (
              <Chip key={t.id} label={t.name} on={t.id === task?.id} onPress={() => setTaskId(t.id)} />
            ))}
          </View>
          <AddField
            placeholder="New task (e.g. 100m sprint)"
            onAdd={(name) => {
              const id = newId('t');
              benchStore.set((b) => ({ tasks: [...b.tasks, { id, name }] }));
              setTaskId(id);
            }}
          />
          <Label>Person</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {persons.map((p) => (
              <Chip key={p.id} label={p.name} on={p.id === person?.id} onPress={() => setPersonId(p.id)} />
            ))}
          </View>
          <AddField
            placeholder="New person"
            onAdd={(name) => {
              const id = newId('p');
              benchStore.set((b) => ({ persons: [...b.persons, { id, name }] }));
              setPersonId(id);
            }}
          />
        </Card>

        <Card>
          <Label>Record a time</Label>
          <Text style={s.dim}>
            {canRecord ? `${person.name} · ${task.name}` : 'Add a task and a person first'}
          </Text>
          <Text style={s.big}>{formatMs(elapsed, true)}</Text>
          <View style={s.row}>
            {running ? (
              <View style={{ flex: 1 }}>
                <Button title="Stop" tone="stop" onPress={() => setWatch((w) => sw.stop(w, Date.now()))} />
              </View>
            ) : elapsed > 0 ? (
              <>
                <View style={{ flex: 1 }}>
                  <Button title="Discard" tone="ghost" onPress={() => setWatch(sw.reset())} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Save"
                    tone="go"
                    disabled={!canRecord}
                    onPress={() => {
                      save(elapsed);
                      setWatch(sw.reset());
                    }}
                  />
                </View>
              </>
            ) : (
              <View style={{ flex: 1 }}>
                <Button title="Start" tone="go" disabled={!canRecord} onPress={() => setWatch((w) => sw.start(w, Date.now()))} />
              </View>
            )}
          </View>
          {!!msg && <Text style={{ color: colors.go, textAlign: 'center' }}>{msg}</Text>}
          <Label>Or enter a time</Label>
          <View style={s.between}>
            <DurationField valueSec={manual} onChange={setManual} />
            <Button
              small
              title="Add"
              disabled={!canRecord || manual <= 0}
              onPress={() => {
                save(manual * 1000);
                setManual(0);
              }}
            />
          </View>
        </Card>

        {task && (
          <Card>
            <View style={s.between}>
              <Label>Leaderboard · {task.name}</Label>
              <View style={s.row}>
                <Chip label="Best" on={sortBy === 'best'} onPress={() => setSortBy('best')} />
                <Chip label="Avg" on={sortBy === 'avg'} onPress={() => setSortBy('avg')} />
              </View>
            </View>
            {board.length === 0 && <Text style={s.dim}>No times yet.</Text>}
            {board.map((r) => (
              <View key={r.person.id} style={{ gap: 4 }}>
                <View style={s.between}>
                  <Text style={[s.text, { flex: 1 }]} numberOfLines={1}>
                    {r.rank}. {r.person.name}
                  </Text>
                  <Text style={[s.text, { fontVariant: ['tabular-nums'] }]}>{formatMs(r.stats[sortBy], true)}</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      width: `${slowest ? (r.stats[sortBy] / slowest) * 100 : 0}%`,
                      backgroundColor: r.rank === 1 ? colors.go : colors.accent,
                    }}
                  />
                </View>
                <Text style={s.dim}>
                  {r.stats.count} runs · best {formatMs(r.stats.best, true)} · avg {formatMs(r.stats.avg, true)} · median{' '}
                  {formatMs(r.stats.median, true)} · ±{(r.stats.stdDev / 1000).toFixed(2)}s
                  {r.trendMs === null ? '' : ` · ${r.trendMs <= 0 ? '▼ faster' : '▲ slower'} ${(Math.abs(r.trendMs) / 1000).toFixed(2)}s`}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {summary && task && (
          <Card>
            <Label>Task analytics</Label>
            <Text style={s.text}>
              {summary.count} runs by {board.length} {board.length === 1 ? 'person' : 'people'}
            </Text>
            <Text style={s.dim}>
              Fastest {formatMs(summary.best, true)} ({board[0]?.person.name}) · avg {formatMs(summary.avg, true)} · median{' '}
              {formatMs(summary.median, true)} · slowest {formatMs(summary.worst, true)}
            </Text>
          </Card>
        )}

        {task && person && runs.length > 0 && (
          <Card>
            <Label>{person.name} · recent runs</Label>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 70 }}>
              {recent.map((r) => (
                <View
                  key={r.id}
                  style={{ flex: 1, height: Math.max(4, (r.ms / recentMax) * 70), backgroundColor: colors.accent, borderRadius: 3 }}
                />
              ))}
            </View>
            <Text style={s.dim}>Shorter bar = faster. Oldest to newest.</Text>
            {runs.map((r) => (
              <View key={r.id} style={s.between}>
                <Text style={s.dim}>{when(r.at)}</Text>
                <Text style={[s.text, { fontVariant: ['tabular-nums'] }]}>{formatMs(r.ms, true)}</Text>
                <Button small tone="ghost" title="✕" onPress={() => benchStore.set((b) => ({ records: b.records.filter((x) => x.id !== r.id) }))} />
              </View>
            ))}
          </Card>
        )}

        {(task || person) && (
          <Card>
            <Label>Manage</Label>
            {task && (
              <Button
                small
                tone="ghost"
                title={`Delete task "${task.name}" + its times`}
                onPress={() => benchStore.set((b) => removeTask(b.records, b.tasks, task.id))}
              />
            )}
            {person && (
              <Button
                small
                tone="ghost"
                title={`Delete person "${person.name}" + their times`}
                onPress={() => benchStore.set((b) => removePerson(b.records, b.persons, person.id))}
              />
            )}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
