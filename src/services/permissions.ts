import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import * as Location from 'expo-location';

const P = PermissionsAndroid.PERMISSIONS;

export async function requestSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const wanted = [P.SEND_SMS, P.RECEIVE_SMS, P.READ_SMS, P.READ_PHONE_STATE].filter(Boolean) as Permission[];
  const res = await PermissionsAndroid.requestMultiple(wanted);
  return res[P.SEND_SMS] === 'granted';
}

export async function hasSmsPermissions(): Promise<{ send: boolean; read: boolean }> {
  if (Platform.OS !== 'android') return { send: false, read: false };
  const [send, read] = await Promise.all([PermissionsAndroid.check(P.SEND_SMS), PermissionsAndroid.check(P.READ_SMS)]);
  return { send, read };
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return true;
  const r = await PermissionsAndroid.request(P.POST_NOTIFICATIONS);
  return r === 'granted';
}

/** Foreground first, then "Allow all the time" (needed for SOS with screen off). */
export async function requestBackgroundLocation(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted';
}
