import type { CameraRef } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Button from '../../components/Button';
import OfflineMap, { type Pin } from '../../components/OfflineMap';
import { useLive } from '../../hooks/useRefresh';
import { listMessages, nameFor } from '../../services/db';
import { installedPacks } from '../../services/maps';
import { formatPH } from '../../services/phone';
import { C } from '../../theme';

/** Latest received location per sender. */
function latestPins(): Pin[] {
  const seen = new Set<string>();
  const pins: Pin[] = [];
  for (const m of listMessages('in', 500)) {
    const key = m.address.replace(/\D/g, '').slice(-10);
    if (seen.has(key)) continue;
    seen.add(key);
    pins.push({
      id: String(m.id),
      lat: m.lat,
      lng: m.lng,
      accuracy: m.accuracy,
      color: m.sos ? C.danger : C.primary,
      label: `${m.sos ? '🚨 ' : ''}${nameFor(m.address) ?? formatPH(m.address)}`,
    });
  }
  return pins;
}

export default function MapScreen() {
  const cam = useRef<CameraRef>(null);
  const [pins] = useLive(latestPins);
  const [mapVersion] = useLive(useCallback(() => installedPacks().length, []));
  const first = pins[0];

  const recenter = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    cam.current?.flyTo({ center: [l.coords.longitude, l.coords.latitude], zoom: 16, duration: 800 });
  };

  return (
    <View style={{ flex: 1 }}>
      <OfflineMap
        ref={cam}
        version={mapVersion}
        center={first ? [first.lng, first.lat] : [121.0, 14.6]}
        zoom={first ? 14 : 10}
        pins={pins}
        onPinPress={(id) => router.push(`/message/${id}`)}
        overlay={
          <View style={styles.fabs}>
            <Button title="◎ Me" onPress={recenter} style={styles.fab} />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fabs: { position: 'absolute', right: 12, bottom: 16, gap: 8 },
  fab: { elevation: 4, minWidth: 72 },
});
