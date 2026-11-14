import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import AccuracyBadge from './src/components/AccuracyBadge';
import { encode } from './src/services/codec';
import { ensurePermission, Fix, getBestFix } from './src/services/location';

export default function App() {
  const [fix, setFix] = useState<Fix | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = async () => {
    setError(null);
    if (!(await ensurePermission())) {
      setError('Location permission denied. Enable in Settings.');
      return;
    }
    setBusy(true);
    const best = await getBestFix(setFix);
    setBusy(false);
    if (!best) setError('No GPS fix. Go outdoors, try again.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>MapSMS</Text>

      <View style={styles.card}>
        {fix ? (
          <>
            <Text style={styles.coords}>{fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}</Text>
            <AccuracyBadge meters={fix.accuracy} />
            {fix.altitude != null && <Text style={styles.meta}>Altitude {Math.round(fix.altitude)} m</Text>}
            <Text style={styles.meta}>{new Date(fix.timestamp).toLocaleTimeString()}</Text>
            <Text style={styles.preview}>{encode(fix)}</Text>
          </>
        ) : (
          <Text style={styles.meta}>Tap “Locate me” to get GPS fix.</Text>
        )}
        {busy && <ActivityIndicator style={{ marginTop: 12 }} />}
        {busy && <Text style={styles.meta}>Improving accuracy…</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={locate} disabled={busy}>
        <Text style={styles.btnText}>{busy ? 'Locating…' : 'Locate me'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f9', padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 10, elevation: 2 },
  coords: { fontSize: 22, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  meta: { textAlign: 'center', color: '#555' },
  preview: { fontFamily: 'monospace', fontSize: 12, backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, color: '#333' },
  error: { color: '#c62828', textAlign: 'center', fontWeight: '600' },
  btn: { marginTop: 'auto', backgroundColor: '#1565c0', padding: 18, borderRadius: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
