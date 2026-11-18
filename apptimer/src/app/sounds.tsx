import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Button, Card, Label, Screen, s } from '../components/ui';
import { settingsStore, type SoundRole } from '../lib/settings';
import { allSounds, playSound, soundName } from '../lib/sounds';
import { colors } from '../theme';

const ROLES: { role: SoundRole; title: string }[] = [
  { role: 'delayEnd', title: 'Start delay ends' },
  { role: 'stepEnd', title: 'Step ends' },
  { role: 'finish', title: 'Timer finished' },
  { role: 'beeper', title: 'Interval beeper' },
];

export default function Sounds() {
  const settings = settingsStore.use();
  const [role, setRole] = useState<SoundRole>('stepEnd');
  const options = useMemo(() => allSounds(), []);
  const groups = (['Bundled', 'System'] as const).map((g) => ({ g, items: options.filter((o) => o.group === g) }));
  const current = settings.sounds[role];

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.pad}>
        <Card>
          <Label>Assign sound to</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ROLES.map((r) => (
              <Button key={r.role} small tone={role === r.role ? 'accent' : 'ghost'} title={r.title} onPress={() => setRole(r.role)} />
            ))}
          </View>
          <Text style={s.dim}>Current: {soundName(current)}</Text>
        </Card>

        {groups.map(({ g, items }) => (
          <Card key={g}>
            <Label>{g === 'System' ? 'System sounds' : 'Bundled sounds'}</Label>
            {items.length === 0 && (
              <Text style={s.dim}>
                {g === 'System' ? 'No system sound library available on this device (Android only).' : 'None'}
              </Text>
            )}
            {items.map((o) => (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                onPress={() => {
                  settingsStore.set((st) => ({ sounds: { ...st.sounds, [role]: o.id } }));
                  playSound(o.id);
                }}
                style={[s.between, { paddingVertical: 8 }]}
              >
                <Text style={[s.text, current === o.id && { color: colors.accent, fontWeight: '700' }]}>
                  {current === o.id ? '● ' : '○ '}
                  {o.name}
                </Text>
                <Button small tone="ghost" title="▶" onPress={() => playSound(o.id)} />
              </Pressable>
            ))}
          </Card>
        ))}

        <Card>
          <Label>General</Label>
          <View style={s.between}>
            <Text style={s.text}>Vibrate</Text>
            <Switch value={settings.vibrate} onValueChange={(v) => settingsStore.set({ vibrate: v })} />
          </View>
          <View style={s.between}>
            <Text style={s.text}>Volume {Math.round(settings.volume * 100)}%</Text>
            <View style={s.row}>
              <Button small tone="ghost" title="−" onPress={() => settingsStore.set((st) => ({ volume: Math.max(0, +(st.volume - 0.1).toFixed(1)) }))} />
              <Button small tone="ghost" title="+" onPress={() => settingsStore.set((st) => ({ volume: Math.min(1, +(st.volume + 0.1).toFixed(1)) }))} />
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
