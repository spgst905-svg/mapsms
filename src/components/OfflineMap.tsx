import { Camera, Map, Marker, UserLocation, type CameraRef } from '@maplibre/maplibre-react-native';
import { forwardRef, useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { buildOfflineStyle } from '../services/mapStyle';
import { installedPacks, mapsRoot } from '../services/maps';

export type Pin = { id: string; lat: number; lng: number; accuracy?: number | null; color: string; label?: string };

type Props = {
  pins: Pin[];
  center: [lng: number, lat: number];
  zoom?: number;
  showUser?: boolean;
  onPinPress?: (id: string) => void;
  version?: number; // bump to rebuild style after downloads
  overlay?: ReactNode;
};

const MANILA: [number, number] = [121.0, 14.6];

const OfflineMap = forwardRef<CameraRef, Props>(function OfflineMap(
  { pins, center, zoom = 15, showUser = true, onPinPress, version = 0, overlay },
  cameraRef,
) {
  const { style, hasMaps } = useMemo(() => {
    const root = mapsRoot();
    const packs = installedPacks();
    return { style: buildOfflineStyle(root ?? '', packs), hasMaps: packs.length > 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return (
    <View style={styles.fill}>
      <Map style={styles.fill} mapStyle={style} logo={false} attribution compass>
        <Camera ref={cameraRef} initialViewState={{ center: center ?? MANILA, zoom }} />
        {showUser && <UserLocation accuracy heading />}
        {pins.map((p) => (
          <Marker key={p.id} id={p.id} lngLat={[p.lng, p.lat]} anchor="bottom" onPress={() => onPinPress?.(p.id)}>
            <View style={styles.pinWrap}>
              {p.label ? <Text style={[styles.pinLabel, { backgroundColor: p.color }]} numberOfLines={1}>{p.label}</Text> : null}
              <View style={[styles.pin, { backgroundColor: p.color }]} />
            </View>
          </Marker>
        ))}
      </Map>
      {!hasMaps && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>No offline map downloaded. Pins still accurate. Settings → Offline maps.</Text>
        </View>
      )}
      {overlay}
    </View>
  );
});

export default OfflineMap;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pinWrap: { alignItems: 'center' },
  pin: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: '#fff', elevation: 4 },
  pinLabel: { color: '#fff', fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 2, maxWidth: 140 },
  banner: { position: 'absolute', top: 8, left: 8, right: 8, backgroundColor: '#fff8e1', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#f0d58c' },
  bannerText: { color: '#6b5200', fontSize: 13 },
});
