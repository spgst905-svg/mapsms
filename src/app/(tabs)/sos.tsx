import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import Button from '../../components/Button';
import { emergencyContacts } from '../../services/db';
import { requestBackgroundLocation, requestNotificationPermission, requestSmsPermissions } from '../../services/permissions';
import { getSosInterval, getSosState, setSosInterval, startSos, stopSos } from '../../services/sos';
import { C, S } from '../../theme';

const COUNTDOWN = 3;
const INTERVALS = [2, 5, 10, 15];

export default function SosScreen() {
  const [state, setState] = useState(getSosState);
  const [count, setCount] = useState<number | null>(null);
  const [interval, setIntervalMin] = useState(getSosInterval);
  const [contacts, setContacts] = useState(emergencyContacts);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    setState(getSosState());
    setContacts(emergencyContacts());
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const fire = async () => {
    await requestSmsPermissions();
    await requestNotificationPermission();
    const bg = await requestBackgroundLocation();
    const r = await startSos();
    refresh();
    Vibration.vibrate([0, 300, 150, 300]);
    if (r.error) Alert.alert('SOS issue', r.error);
    else if (!bg) Alert.alert('SOS sent', `Sent to ${r.sentTo}/${r.contacts}. Set location to "Allow all the time" for repeats with screen off.`);
  };

  const press = () => {
    if (!contacts.length) {
      Alert.alert('No emergency contacts', 'Add at least 1 emergency contact first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add now', onPress: () => router.push('/contacts') },
      ]);
      return;
    }
    let n = COUNTDOWN;
    setCount(n);
    Vibration.vibrate(100);
    timer.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(timer.current!);
        setCount(null);
        fire();
      } else {
        setCount(n);
        Vibration.vibrate(100);
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (timer.current) clearInterval(timer.current);
    setCount(null);
  };

  const stop = () =>
    Alert.alert('Stop SOS?', '', [
      { text: 'Keep running', style: 'cancel' },
      { text: 'Stop', onPress: async () => (await stopSos(false), refresh()) },
      { text: "Stop + send \"I'm safe\"", onPress: async () => (await stopSos(true), refresh()) },
    ]);

  return (
    <View style={[S.screen, styles.wrap]}>
      {state.active ? (
        <>
          <View style={[styles.big, { backgroundColor: C.danger }]}>
            <Text style={styles.bigText}>SOS{'\n'}ACTIVE</Text>
          </View>
          <Text style={styles.status}>
            Last sent: {state.lastSent ? new Date(state.lastSent).toLocaleTimeString() : 'waiting for GPS…'}
            {state.lastAccuracy != null ? ` (±${Math.round(state.lastAccuracy)} m)` : ''}
          </Text>
          <Text style={S.sub}>Repeats every {interval} min to {contacts.length} contact(s).</Text>
          <Button big title="Stop SOS" onPress={stop} color={C.text} style={{ alignSelf: 'stretch' }} />
        </>
      ) : count != null ? (
        <>
          <Pressable style={[styles.big, { backgroundColor: C.warn }]} onPress={cancelCountdown}>
            <Text style={styles.bigText}>{count}</Text>
            <Text style={styles.tapCancel}>Tap to cancel</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={({ pressed }) => [styles.big, { backgroundColor: C.danger, opacity: pressed ? 0.85 : 1 }]} onPress={press}>
            <Text style={styles.bigText}>SOS</Text>
          </Pressable>
          <Text style={S.sub}>3 s countdown, then auto-sends location to emergency contacts.</Text>
          <View style={[S.card, { alignSelf: 'stretch' }]}>
            <Text style={S.h2}>Emergency contacts ({contacts.length}/5)</Text>
            <Text style={S.sub}>{contacts.map((c) => c.name).join(', ') || 'None yet'}</Text>
            <Button title="Manage contacts" onPress={() => router.push('/contacts')} outline />
            <Text style={[S.h2, { marginTop: 6 }]}>Repeat every</Text>
            <View style={styles.row}>
              {INTERVALS.map((m) => (
                <Pressable
                  key={m}
                  style={[styles.pill, interval === m && styles.pillOn]}
                  onPress={() => (setSosInterval(m), setIntervalMin(m))}
                >
                  <Text style={[styles.pillText, interval === m && { color: '#fff' }]}>{m} min</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={S.sub}>Emergency: call 911 directly.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16 },
  big: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  bigText: { color: '#fff', fontSize: 52, fontWeight: '900', textAlign: 'center' },
  tapCancel: { color: '#fff', fontWeight: '700' },
  status: { fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  pillOn: { backgroundColor: C.danger, borderColor: C.danger },
  pillText: { fontWeight: '600', color: C.text },
});
