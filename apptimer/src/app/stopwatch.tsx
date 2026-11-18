import { useKeepAwake } from 'expo-keep-awake';
import { Text, View } from 'react-native';
import { Button, Screen, s } from '../components/ui';
import { formatMs } from '../lib/format';
import { useStopwatch } from '../hooks/useStopwatch';

function Awake() {
  useKeepAwake();
  return null;
}

export default function Stopwatch() {
  const w = useStopwatch();
  return (
    <Screen>
      {w.running && <Awake />}
      <View style={[s.pad, { flex: 1, justifyContent: 'center' }]}>
        <Text style={s.big} accessibilityLabel={`Elapsed ${formatMs(w.elapsed)}`}>
          {formatMs(w.elapsed, true)}
        </Text>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Button title="Reset" tone="ghost" onPress={w.reset} disabled={w.running || w.elapsed === 0} />
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
    </Screen>
  );
}
