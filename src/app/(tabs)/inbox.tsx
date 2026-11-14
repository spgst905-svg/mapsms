import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { isNativeAvailable } from '../../../modules/mapsms-native';
import Button from '../../components/Button';
import { useLive } from '../../hooks/useRefresh';
import { listMessages, nameFor, type Message } from '../../services/db';
import { syncInbox } from '../../services/inbox';
import { requestSmsPermissions } from '../../services/permissions';
import { formatPH } from '../../services/phone';
import { C, S } from '../../theme';

export default function InboxScreen() {
  const [tab, setTab] = useState<'in' | 'out'>('in');
  const load = useCallback(() => listMessages(tab), [tab]);
  const [items, refresh] = useLive(load);
  const [syncing, setSyncing] = useState(false);

  const sync = async () => {
    setSyncing(true);
    await requestSmsPermissions();
    try {
      syncInbox();
    } catch {}
    refresh();
    setSyncing(false);
  };

  const render = ({ item }: { item: Message }) => {
    const who = nameFor(item.address) ?? formatPH(item.address);
    return (
      <Pressable style={[styles.row, item.sos ? styles.sosRow : null]} onPress={() => router.push(`/message/${item.id}`)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.who}>
            {item.sos ? '🚨 SOS · ' : ''}
            {!item.read && item.direction === 'in' ? '● ' : ''}
            {who}
          </Text>
          <Text style={S.sub}>
            {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
            {item.accuracy != null ? ` · ±${item.accuracy} m` : ''}
            {item.battery != null ? ` · 🔋${item.battery}%` : ''}
          </Text>
          {item.note ? <Text style={styles.note} numberOfLines={1}>{item.note}</Text> : null}
        </View>
        <Text style={S.sub}>{new Date(item.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
      </Pressable>
    );
  };

  return (
    <View style={S.screen}>
      <View style={styles.seg}>
        {(['in', 'out'] as const).map((t) => (
          <Pressable key={t} style={[styles.segBtn, tab === t && styles.segOn]} onPress={() => setTab(t)}>
            <Text style={[styles.segText, tab === t && { color: '#fff' }]}>{t === 'in' ? 'Received' : 'Sent'}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={items}
        keyExtractor={(m) => String(m.id)}
        renderItem={render}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={sync} />}
        ListEmptyComponent={
          <View style={[S.card, { margin: 4 }]}>
            <Text style={S.h2}>No locations yet</Text>
            <Text style={S.sub}>
              {isNativeAvailable
                ? 'MapSMS texts appear here automatically. Pull down to re-scan phone inbox.'
                : 'Auto-read needs Android app build. Expo Go cannot read SMS.'}
            </Text>
            {isNativeAvailable && <Button title="Scan SMS inbox" onPress={sync} outline />}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', margin: 12, marginBottom: 0, backgroundColor: '#e8ebef', borderRadius: 10, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segOn: { backgroundColor: C.primary },
  segText: { fontWeight: '600', color: C.text },
  row: { ...S.card, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sosRow: { borderColor: C.danger, borderWidth: 2, backgroundColor: '#fff5f5' },
  who: { fontSize: 16, fontWeight: '700', color: C.text },
  note: { color: C.text, fontStyle: 'italic' },
});
