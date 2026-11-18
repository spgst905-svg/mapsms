import { Platform } from 'react-native';
import { Directory } from 'expo-file-system';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { settingsStore } from './settings';

export type SoundOption = { id: string; name: string; group: 'Bundled' | 'System' };

const BUNDLED: Record<string, number> = {
  beep: require('../../assets/sounds/beep.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  chime: require('../../assets/sounds/chime.wav'),
  bell: require('../../assets/sounds/bell.wav'),
  alarm: require('../../assets/sounds/alarm.wav'),
  digital: require('../../assets/sounds/digital.wav'),
};

const SYSTEM_DIRS = ['notifications', 'alarms', 'ui', 'ringtones'];

export function bundledSounds(): SoundOption[] {
  return Object.keys(BUNDLED).map((k) => ({
    id: `bundled:${k}`,
    name: k[0].toUpperCase() + k.slice(1),
    group: 'Bundled',
  }));
}

/**
 * Android: lists files under /system/media/audio/*. iOS exposes no system sound
 * library to apps, so this returns []. Failures (unreadable dirs) are skipped.
 */
export function systemSounds(): SoundOption[] {
  if (Platform.OS !== 'android') return [];
  const out: SoundOption[] = [];
  for (const dir of SYSTEM_DIRS) {
    try {
      const d = new Directory(`file:///system/media/audio/${dir}`);
      for (const entry of d.list()) {
        if (entry instanceof Directory) continue;
        const base = entry.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
        out.push({ id: `system:${entry.uri}`, name: `${base} (${dir})`, group: 'System' });
      }
    } catch {
      // directory missing or not readable on this device
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function allSounds(): SoundOption[] {
  return [...bundledSounds(), ...systemSounds()];
}

export function soundName(id: string): string {
  if (id.startsWith('bundled:')) return id.slice(8);
  const base = id.split('/').pop() ?? id;
  return base.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
}

const players = new Map<string, AudioPlayer>();
let modeSet = false;

function sourceFor(id: string) {
  if (id.startsWith('bundled:')) return BUNDLED[id.slice(8)] ?? BUNDLED.beep;
  if (id.startsWith('system:')) return { uri: id.slice(7) };
  return BUNDLED.beep;
}

export async function playSound(id: string) {
  try {
    if (!modeSet) {
      modeSet = true;
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    }
    let p = players.get(id);
    if (!p) {
      p = createAudioPlayer(sourceFor(id) as never);
      players.set(id, p);
    }
    p.volume = settingsStore.get().volume;
    await p.seekTo(0);
    p.play();
  } catch {
    // never let audio failure break a running timer
  }
}

export function buzz() {
  if (settingsStore.get().vibrate) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

export function fire(role: keyof ReturnType<typeof settingsStore.get>['sounds']) {
  playSound(settingsStore.get().sounds[role]);
  buzz();
}
