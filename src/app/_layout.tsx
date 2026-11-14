import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { db, getSetting, setSetting } from '../services/db';
import { startInboxListener, syncInbox } from '../services/inbox';

export default function RootLayout() {
  useEffect(() => {
    db();
    try {
      syncInbox();
    } catch {
      /* SMS permission not granted yet */
    }
    const stop = startInboxListener();
    if (!getSetting('onboarded', false)) {
      setSetting('onboarded', true);
      setTimeout(() => router.push('/device'), 300);
    }
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        try {
          syncInbox();
        } catch {}
      }
    });
    return () => {
      stop();
      sub.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTitleStyle: { fontWeight: '700' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="contacts" options={{ title: 'Contacts' }} />
        <Stack.Screen name="maps" options={{ title: 'Offline maps' }} />
        <Stack.Screen name="device" options={{ title: 'Phone setup check' }} />
        <Stack.Screen name="message/[id]" options={{ title: 'Location' }} />
      </Stack>
    </>
  );
}
