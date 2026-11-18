import { useKeepAwake } from 'expo-keep-awake';
import { FlatList, Text, View } from 'react-native';
import { Button, Screen, s } from '../components/ui';
import { formatMs } from '../lib/format';
import { lapExtremes } from '../lib/stopwatch';
import { useStopwatch } from '../hooks/useStopwatch';
import { colors } from '../theme';

function Awake() {
  useKeepAwake();
  return null;
}

export default function Laps() {
  const w = useStopwatch();
  const { best, worst } = lapExtremes(w.state.laps);
  const currentLap = w.elapsed - (w.state.laps[0]?.totalMs ?? 0);
  return (
    <Screen>
      {w.running && <Awake />}
      <View style={s.pad}>
        <Text style={s.big}>{formatMs(w.elapsed, true)}</Text>
        {w.elapsed > 0 && <Text style={[s.dim, { textAlign: 'center' }]}>Lap {w.state.laps.length + 1} · {formatMs(currentLap, true)}</Text>}
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            {w.running ? (
              <Button title="Lap" tone="accent" onPress={w.lap} />
            ) : (
              <Button title="Reset" tone="ghost" onPress={w.reset} disabled={w.elapsed === 0} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            {w.running ? (
              <Button title="Stop" tone="stop" onPress={w.stop} />
            ) : (
              <Button title={w.elapsed > 0 ? 'Resume' : 'Start'} tone="go" onPress={w.start} />
            )}
          </View>
        </View>
      </View>
      <FlatList
        data={w.state.laps}
        keyExtractor={(l) => String(l.n)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListEmptyComponent={<Text style={[s.dim, { textAlign: 'center', marginTop: 24 }]}>No laps yet</Text>}
        renderItem={({ item }) => (
          <View style={[s.between, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <Text style={[s.text, { width: 56 }]}>#{item.n}</Text>
            <Text
              style={[
                s.text,
                { fontVariant: ['tabular-nums'] },
                item.n === best && { color: colors.go },
                item.n === worst && { color: colors.stop },
              ]}
            >
              {formatMs(item.splitMs, true)}
            </Text>
            <Text style={[s.dim, { fontVariant: ['tabular-nums'] }]}>{formatMs(item.totalMs, true)}</Text>
          </View>
        )}
      />
    </Screen>
  );
}
