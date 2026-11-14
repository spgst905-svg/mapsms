import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import OfflineMap from '../../components/OfflineMap';
import { deleteMessage, getMessage, markRead, nameFor } from '../../services/db';
import { bearingDeg, compassDir, distanceM, formatDistance } from '../../services/geo';
import { formatPH } from '../../services/phone';
import { C, S } from '../../theme';

export default function MessageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const msg = getMessage(Number(id));
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (msg && msg.direction === 'in' && !msg.read) markRead(msg.id);
    let posSub: Location.LocationSubscription | null = null;
    let headSub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      posSub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 5 }, (l) =>
        setMe({ lat: l.coords.latitude, lng: l.coords.longitude }),
      );
      headSub = await Location.watchHeadingAsync((h) => setHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading));
    })();
    return () => {
      posSub?.remove();
      headSub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!msg) return <Text style={{ padding: 20 }}>Message not found.</Text>;

  const who = nameFor(msg.address) ?? formatPH(msg.address);
  const dist = me ? distanceM(me.lat, me.lng, msg.lat, msg.lng) : null;
  const bearing = me ? bearingDeg(me.lat, me.lng, msg.lat, msg.lng) : null;
  const arrow = bearing != null ? bearing - (heading ?? 0) : null;
  const coords = `${msg.lat.toFixed(5)},${msg.lng.toFixed(5)}`;

  const openExternal = async (app: 'geo' | 'waze') => {
    const url = app === 'waze' ? `https://waze.com/ul?ll=${coords}&navigate=yes` : `geo:${coords}?q=${coords}(${encodeURIComponent(who)})`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('No app found', 'Install Google Maps or Waze.');
    }
  };

  return (
    <ScrollView style={S.screen} contentContainerStyle={{ gap: 12, paddingBottom: 30 }}>
      <Stack.Screen options={{ title: msg.sos ? `🚨 SOS · ${who}` : who }} />
      <View style={{ height: 320 }}>
        <OfflineMap
          center={[msg.lng, msg.lat]}
          zoom={16}
          pins={[{ id: 'm', lat: msg.lat, lng: msg.lng, accuracy: msg.accuracy, color: msg.sos ? C.danger : C.primary, label: who }]}
        />
      </View>
      <View style={[S.card, { marginHorizontal: 12 }]}>
        <Text style={styles.coords}>{coords.replace(',', ', ')}</Text>
        <Text style={S.sub}>
          {msg.direction === 'in' ? 'From' : 'To'} {who} · {new Date(msg.date).toLocaleString()}
          {msg.accuracy != null ? ` · ±${msg.accuracy} m` : ''}
          {msg.battery != null ? ` · 🔋${msg.battery}%` : ''}
        </Text>
        {msg.note ? <Text style={styles.note}>“{msg.note}”</Text> : null}
      </View>

      {dist != null && arrow != null && (
        <View style={[S.card, styles.compass, { marginHorizontal: 12 }]}>
          <Text style={[styles.arrow, { transform: [{ rotate: `${arrow}deg` }] }]}>⬆</Text>
          <View>
            <Text style={styles.dist}>{formatDistance(dist)}</Text>
            <Text style={S.sub}>
              {compassDir(bearing!)} · {Math.round(bearing!)}° {heading == null ? '(compass calibrating)' : ''}
            </Text>
            <Text style={S.sub}>Arrow points to target. Works offline.</Text>
          </View>
        </View>
      )}

      <View style={{ gap: 8, marginHorizontal: 12 }}>
        <Button title="Navigate (Google Maps)" onPress={() => openExternal('geo')} />
        <Button title="Navigate (Waze)" onPress={() => openExternal('waze')} outline />
        <Button title="Call" onPress={() => Linking.openURL(`tel:${msg.address}`)} outline color={C.ok} />
        <Button
          title="Copy coordinates"
          onPress={async () => {
            await Clipboard.setStringAsync(coords);
            Alert.alert('Copied', coords);
          }}
          outline
        />
        <Button
          title="Delete"
          color={C.danger}
          outline
          onPress={() =>
            Alert.alert('Delete this location?', '', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => (deleteMessage(msg.id), router.back()) },
            ])
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  coords: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], color: C.text },
  note: { fontSize: 16, fontStyle: 'italic', color: C.text },
  compass: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  arrow: { fontSize: 56, color: C.primary },
  dist: { fontSize: 26, fontWeight: '800', color: C.text },
});
