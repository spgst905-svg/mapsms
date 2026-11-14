import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useLive } from '../../hooks/useRefresh';
import { unreadCount } from '../../services/db';
import { C } from '../../theme';

const icon = (glyph: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const [unread] = useLive(unreadCount);
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: C.primary, headerTitleStyle: { fontWeight: '700' } }}>
      <Tabs.Screen name="index" options={{ title: 'Share', tabBarIcon: icon('📍') }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarIcon: icon('📨'), tabBarBadge: unread || undefined }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: icon('🗺️') }} />
      <Tabs.Screen
        name="sos"
        options={{ title: 'SOS', tabBarIcon: icon('🚨'), tabBarActiveTintColor: C.danger }}
      />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
