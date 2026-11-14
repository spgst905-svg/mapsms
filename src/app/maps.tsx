import * as Network from 'expo-network';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { isNativeAvailable } from '../../modules/mapsms-native';
import Button from '../components/Button';
import {
  deletePack,
  downloadPack,
  getPackBaseUrl,
  installedPacks,
  mapsRoot,
  needsUpdate,
  PACKS,
  pauseDownload,
  setMapsStorage,
  setPackBaseUrl,
  setWifiOnly,
  storageDirs,
  wifiOnly,
  type Progress,
} from '../services/maps';
import type { MapPack } from '../services/mapPacks';
import { C, S } from '../theme';

const mb = (b: number) => `${(b / 1048576).toFixed(b < 10 * 1048576 ? 1 : 0)} MB`;
const gb = (b: number) => `${(b / 1073741824).toFixed(1)} GB`;

export default function MapsScreen() {
  const [installed, setInstalled] = useState(installedPacks);
  const [progress, setProgress] = useState<Record<string, Progress | undefined>>({});
  const [wifi, setWifi] = useState(wifiOnly);
  const [root, setRoot] = useState(mapsRoot);
  const [baseUrl, setBaseUrl] = useState(getPackBaseUrl);
  const dirs = storageDirs();
  const current = dirs.find((d) => root?.startsWith(d.path));

  const start = async (pack: MapPack) => {
    if (wifi) {
      const net = await Network.getNetworkStateAsync();
      if (net.type !== Network.NetworkStateType.WIFI) {
        return Alert.alert('Wi-Fi only', 'Connect to Wi-Fi, or turn off "Wi-Fi only" below.');
      }
    }
    if (current && current.freeBytes < pack.estMB * 1048576 * 1.2) {
      return Alert.alert('Not enough space', `Need ~${pack.estMB} MB. Free: ${mb(current.freeBytes)}.`);
    }
    setProgress((p) => ({ ...p, [pack.id]: { bytes: 0, total: 0 } }));
    try {
      await downloadPack(pack, (pr) => setProgress((p) => ({ ...p, [pack.id]: pr })));
      setInstalled(installedPacks());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/paused|cancel/i.test(msg)) Alert.alert('Download failed', `${msg}\n\nTap Download again to resume.`);
    } finally {
      setProgress((p) => ({ ...p, [pack.id]: undefined }));
    }
  };

  const remove = (pack: MapPack) =>
    Alert.alert(`Delete ${pack.name}?`, 'Frees storage. Re-download anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => (deletePack(pack.id), setInstalled(installedPacks())) },
    ]);

  const chooseDir = (path: string) => {
    if (installed.length) {
      return Alert.alert('Delete maps first', 'Changing storage needs maps re-downloaded. Delete existing packs first.');
    }
    setMapsStorage(path);
    setRoot(mapsRoot());
  };

  if (!isNativeAvailable) {
    return (
      <View style={[S.screen, { padding: 16 }]}>
        <Text style={S.sub}>Offline maps need Android app build (not Expo Go).</Text>
      </View>
    );
  }

  return (
    <ScrollView style={S.screen} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={S.card}>
        <Text style={S.h2}>Save maps to</Text>
        {dirs.map((d) => {
          const on = root?.startsWith(d.path);
          return (
            <Pressable key={d.path} style={styles.radioRow} onPress={() => chooseDir(d.path)}>
              <Text style={[styles.radio, on && { color: C.primary }]}>{on ? '◉' : '○'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{d.removable ? 'SD card' : 'Phone storage'}</Text>
                <Text style={S.sub}>{gb(d.freeBytes)} free of {gb(d.totalBytes)}</Text>
              </View>
            </Pressable>
          );
        })}
        {!dirs.some((d) => d.removable) && <Text style={S.sub}>No SD card detected — using phone storage.</Text>}
        <View style={styles.switchRow}>
          <Text style={styles.title}>Download on Wi-Fi only</Text>
          <Switch value={wifi} onValueChange={(v) => (setWifiOnly(v), setWifi(v))} />
        </View>
      </View>

      {PACKS.map((p) => {
        const inst = installed.find((i) => i.id === p.id);
        const pr = progress[p.id];
        const pct = pr && pr.total > 0 ? Math.min(100, Math.round((pr.bytes / pr.total) * 100)) : null;
        return (
          <View key={p.id} style={S.card}>
            <Text style={S.h2}>{p.name}</Text>
            <Text style={S.sub}>
              {p.description} · ~{p.estMB} MB
            </Text>
            {inst && (
              <Text style={{ color: C.ok, fontWeight: '600' }}>
                ✓ Installed · {mb(inst.bytes)} · {new Date(inst.installedAt).toLocaleDateString()}
                {needsUpdate(inst) ? ' · update available' : ''}
              </Text>
            )}
            {pr && (
              <>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${pct ?? 2}%` }]} />
                </View>
                <Text style={S.sub}>
                  {pct != null ? `${pct}% · ` : ''}
                  {mb(pr.bytes)}
                  {pr.total ? ` / ${mb(pr.total)}` : ''}
                </Text>
              </>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {pr ? (
                <Button title="Pause" onPress={() => pauseDownload(p.id)} outline style={{ flex: 1 }} />
              ) : (
                <Button
                  title={inst ? (needsUpdate(inst) ? 'Update' : 'Re-download') : 'Download'}
                  onPress={() => start(p)}
                  outline={!!inst}
                  style={{ flex: 1 }}
                />
              )}
              {inst && !pr && <Button title="Delete" onPress={() => remove(p)} color={C.danger} outline style={{ flex: 1 }} />}
            </View>
          </View>
        );
      })}

      <View style={S.card}>
        <Text style={S.h2}>Map source (advanced)</Text>
        <TextInput
          style={styles.input}
          value={baseUrl}
          onChangeText={setBaseUrl}
          onEndEditing={() => setPackBaseUrl(baseUrl)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={S.sub}>Folder URL holding *.pmtiles files. Map data © OpenStreetMap contributors.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  radio: { fontSize: 20, color: C.sub },
  title: { fontSize: 16, fontWeight: '600', color: C.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  bar: { height: 8, backgroundColor: '#e3e6ea', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: C.primary },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, fontSize: 13 },
});
