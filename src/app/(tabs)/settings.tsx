import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Native, { type SimCard } from '../../../modules/mapsms-native';
import { getSetting, setSetting } from '../../services/db';
import { requestSmsPermissions } from '../../services/permissions';
import { C, S } from '../../theme';

function Row({ title, sub, onPress }: { title: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#eef2f6' }]} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={S.sub}>{sub}</Text> : null}
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const [sims, setSims] = useState<SimCard[]>([]);
  const [simId, setSimId] = useState<number | null>(() => getSetting<number | null>('simSubscriptionId', null));

  useFocusEffect(
    useCallback(() => {
      if (Native) setSims(Native.getSimCards());
    }, []),
  );

  const loadSims = async () => {
    await requestSmsPermissions();
    if (Native) setSims(Native.getSimCards());
  };

  const pickSim = (id: number | null) => {
    setSetting('simSubscriptionId', id);
    setSimId(id);
  };

  return (
    <ScrollView style={S.screen} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={styles.group}>
        <Row title="Contacts" sub="Saved & emergency (SOS) contacts" onPress={() => router.push('/contacts')} />
        <Row title="Offline maps" sub="NCR + CALABARZON, save to SD card" onPress={() => router.push('/maps')} />
        <Row title="Phone setup check" sub="Permissions, battery, HyperOS tips" onPress={() => router.push('/device')} />
      </View>

      <View style={S.card}>
        <Text style={S.h2}>Send SMS using</Text>
        {!Native ? (
          <Text style={S.sub}>Needs Android app build.</Text>
        ) : sims.length === 0 ? (
          <Pressable onPress={loadSims}>
            <Text style={{ color: C.primary, fontWeight: '600' }}>Load SIM cards (needs phone permission)</Text>
          </Pressable>
        ) : (
          [{ subscriptionId: -1, slot: -1, carrier: 'Phone default', displayName: '' } as SimCard, ...sims].map((s) => {
            const id = s.subscriptionId < 0 ? null : s.subscriptionId;
            const on = simId === id;
            return (
              <Pressable key={s.subscriptionId} style={styles.radioRow} onPress={() => pickSim(id)}>
                <Text style={[styles.radio, on && { color: C.primary }]}>{on ? '◉' : '○'}</Text>
                <Text style={styles.rowTitle}>
                  {s.slot >= 0 ? `SIM ${s.slot + 1} · ` : ''}
                  {s.carrier || s.displayName}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={S.card}>
        <Text style={S.h2}>About</Text>
        <Text style={S.sub}>MapSMS · no server · data stays on phone.</Text>
        <Text style={S.sub}>Each location = 1 regular SMS (uses load).</Text>
        <Text style={S.sub}>Map data © OpenStreetMap contributors.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  rowTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  chev: { fontSize: 24, color: C.sub },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  radio: { fontSize: 20, color: C.sub },
});
