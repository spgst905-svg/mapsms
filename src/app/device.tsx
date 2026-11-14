import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Native, { type DeviceStatus, type SettingsPage } from '../../modules/mapsms-native';
import Button from '../components/Button';
import { hasSmsPermissions, requestNotificationPermission, requestSmsPermissions } from '../services/permissions';
import { C, S } from '../theme';

type Check = { label: string; ok: boolean | null; help?: string; fix?: () => void; fixLabel?: string };

const MIN_API = 26;

async function collectChecks(recheck: () => void): Promise<{ st: DeviceStatus | null; list: Check[] }> {
  const open = (p: SettingsPage) => () => Native?.openSettings(p);
    const st = Native?.getDeviceStatus() ?? null;
    const sms = await hasSmsPermissions();
    const fg = await Location.getForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();
    const gpsOn = await Location.hasServicesEnabledAsync();
    const xiaomi = /xiaomi|poco|redmi/i.test(`${Device.manufacturer} ${Device.brand}`);
    const sims = Native?.getSimCards() ?? [];

    const list: Check[] = [
      { label: `Android ${Device.osVersion} (API ${Device.platformApiLevel})`, ok: (Device.platformApiLevel ?? 0) >= MIN_API, help: 'Needs Android 8.0+' },
      { label: 'Native SMS module (APK build)', ok: !!Native, help: 'Running in Expo Go — install the APK for SMS features.' },
      { label: 'Phone / SIM support', ok: st?.hasTelephony ?? null, help: 'No telephony — SMS impossible.' },
      { label: `SIM cards: ${sims.length ? sims.map((s) => s.carrier).join(', ') : 'unknown'}`, ok: sims.length > 0 ? true : null, help: 'Grant phone permission to detect SIMs.' },
      { label: 'GPS turned on', ok: gpsOn, help: 'Turn on Location in quick settings.' },
      { label: 'Location permission', ok: fg.granted, fix: () => Location.requestForegroundPermissionsAsync().then(recheck), fixLabel: 'Allow' },
      {
        label: 'Location "Allow all the time" (SOS)',
        ok: bg.granted,
        help: 'Needed for SOS repeats with screen off.',
        fix: () => Location.requestBackgroundPermissionsAsync().then(recheck),
        fixLabel: 'Allow',
      },
      {
        label: 'Send SMS permission',
        ok: sms.send,
        help: 'If blocked: Settings → Apps → MapSMS → ⋮ → "Allow restricted settings", then allow SMS.',
        fix: () => requestSmsPermissions().then(recheck),
        fixLabel: 'Allow',
      },
      {
        label: 'Read SMS permission (auto inbox)',
        ok: sms.read,
        help: 'Android 13+ blocks this for sideloaded apps until "Allow restricted settings" is enabled.',
        fix: open('app'),
        fixLabel: 'App settings',
      },
      { label: 'Notifications', ok: st?.notificationsEnabled ?? null, fix: () => requestNotificationPermission().then(recheck), fixLabel: 'Allow' },
      { label: 'Full-screen SOS alerts', ok: st?.canUseFullScreenIntent ?? null, fix: open('fullscreen'), fixLabel: 'Open' },
      {
        label: 'Battery: no restrictions',
        ok: st?.ignoringBatteryOptimizations ?? null,
        help: 'HyperOS: Battery saver → "No restrictions".',
        fix: open('battery'),
        fixLabel: 'Open',
      },
    ];
    if (xiaomi) {
      list.push({
        label: 'HyperOS Autostart ON (check manually)',
        ok: null,
        help: 'Security app → Permissions → Autostart → MapSMS ON. Also lock MapSMS in Recents (long-press → lock).',
        fix: open('autostart'),
        fixLabel: 'Open',
      });
      list.push({
        label: 'HyperOS "Send SMS" → Always allow (check manually)',
        ok: null,
        help: 'Settings → Apps → MapSMS → Other permissions → Send SMS → Always allow. Prevents prompt on every SOS.',
        fix: open('app'),
        fixLabel: 'Open',
      });
    }
    return { st, list };
}

export default function DeviceScreen() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [status, setStatus] = useState<DeviceStatus | null>(null);

  const [version, setVersion] = useState(0);
  const recheck = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    collectChecks(recheck).then(({ st, list }) => {
      if (!alive) return;
      setStatus(st);
      setChecks(list);
    });
    return () => {
      alive = false;
    };
  }, [recheck, version]);

  useFocusEffect(recheck);

  const failing = checks.filter((c) => c.ok === false).length;

  return (
    <ScrollView style={S.screen} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={S.card}>
        <Text style={S.h2}>
          {Device.manufacturer} {Device.modelName}
        </Text>
        <Text style={S.sub}>
          {Device.brand} · {Device.totalMemory ? `${(Device.totalMemory / 1073741824).toFixed(0)} GB RAM` : ''}
          {status ? ` · API ${status.sdkInt}` : ''}
        </Text>
        <Text style={[styles.verdict, { color: failing ? C.warn : C.ok }]}>
          {failing ? `⚠️ ${failing} item(s) need attention` : '✅ Compatible — ready'}
        </Text>
      </View>
      {checks.map((c) => (
        <View key={c.label} style={[S.card, styles.row]}>
          <Text style={styles.icon}>{c.ok === true ? '✅' : c.ok === false ? '❌' : '❔'}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.label}>{c.label}</Text>
            {c.ok !== true && c.help ? <Text style={S.sub}>{c.help}</Text> : null}
          </View>
          {c.ok !== true && c.fix ? <Button title={c.fixLabel ?? 'Fix'} onPress={c.fix} outline /> : null}
        </View>
      ))}
      <Button title="Re-check" onPress={recheck} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  verdict: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 20 },
  label: { fontSize: 15, fontWeight: '600', color: C.text },
});
