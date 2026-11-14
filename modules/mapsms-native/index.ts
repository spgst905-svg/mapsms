import { Platform } from 'react-native';
import { requireOptionalNativeModule, type EventSubscription } from 'expo';

export type IncomingSms = { address: string; body: string; date: number };
export type SimCard = { subscriptionId: number; slot: number; carrier: string; displayName: string };
export type StorageDir = { path: string; removable: boolean; freeBytes: number; totalBytes: number };
export type DeviceStatus = {
  ignoringBatteryOptimizations: boolean;
  canUseFullScreenIntent: boolean;
  notificationsEnabled: boolean;
  sdkInt: number;
  manufacturer: string;
  hasTelephony: boolean;
};
export type DownloadProgress = { id: string; bytes: number; total: number };
export type SettingsPage = 'app' | 'battery' | 'autostart' | 'fullscreen' | 'notifications';

type NativeModule = {
  sendSms(number: string, text: string, subscriptionId: number | null): Promise<boolean>;
  getSimCards(): SimCard[];
  readInbox(limit: number): IncomingSms[];
  getDeviceStatus(): DeviceStatus;
  openSettings(which: SettingsPage): boolean;
  getStorageDirs(): StorageDir[];
  fileSize(path: string): number;
  deleteFile(path: string): boolean;
  download(id: string, url: string, dest: string): Promise<string>;
  cancelDownload(id: string): void;
  addListener(event: 'onSmsReceived', cb: (e: IncomingSms) => void): EventSubscription;
  addListener(event: 'onDownloadProgress', cb: (e: DownloadProgress) => void): EventSubscription;
};

/** null on iOS / web / Expo Go (no native build). */
const Native = Platform.OS === 'android' ? requireOptionalNativeModule<NativeModule>('MapSmsNative') : null;

export const isNativeAvailable = Native != null;
export default Native;
