import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, type ColorValue } from 'react-native';
import { colors } from '../theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
  };

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.dim,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Timer', tabBarIcon: icon('⏳') }} />
        <Tabs.Screen name="stopwatch" options={{ title: 'Stopwatch', tabBarIcon: icon('⏱') }} />
        <Tabs.Screen name="laps" options={{ title: 'Laps', tabBarIcon: icon('🏁') }} />
        <Tabs.Screen name="bench" options={{ title: 'Bench', tabBarIcon: icon('📊') }} />
        <Tabs.Screen name="beeper" options={{ title: 'Beeper', tabBarIcon: icon('🔔') }} />
        <Tabs.Screen name="sounds" options={{ title: 'Sounds', tabBarIcon: icon('🔊') }} />
      </Tabs>
    </>
  );
}
