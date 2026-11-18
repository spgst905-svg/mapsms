import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { clampInt } from '../lib/format';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  tone = 'accent',
  disabled,
  small,
}: {
  title: string;
  onPress: () => void;
  tone?: 'accent' | 'go' | 'stop' | 'warn' | 'ghost';
  disabled?: boolean;
  small?: boolean;
}) {
  const bg = tone === 'ghost' ? 'transparent' : colors[tone];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.8 : 1 },
        tone === 'ghost' && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      <Text style={[s.btnText, small && { fontSize: 14 }]}>{title}</Text>
    </Pressable>
  );
}

/** Integer input that commits on blur and clamps to [min, max]. */
export function NumberField({
  value,
  onChange,
  min = 0,
  max = 999,
  width = 64,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  width?: number;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setText(String(value));
  }
  const commit = () => {
    const n = clampInt(text, min, max);
    setText(String(n));
    onChange(n);
  };
  return (
    <View style={s.row}>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[s.input, { width }]}
      />
      {suffix ? <Text style={s.dim}>{suffix}</Text> : null}
    </View>
  );
}

/** Minutes + seconds editor; value in seconds. */
export function DurationField({ valueSec, onChange }: { valueSec: number; onChange: (sec: number) => void }) {
  const m = Math.floor(valueSec / 60);
  const sec = valueSec % 60;
  return (
    <View style={s.row}>
      <NumberField value={m} min={0} max={999} width={56} suffix="m" onChange={(n) => onChange(n * 60 + sec)} />
      <NumberField value={sec} min={0} max={59} width={56} suffix="s" onChange={(n) => onChange(m * 60 + n)} />
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  label: { color: colors.dim, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dim: { color: colors.dim, fontSize: 14 },
  text: { color: colors.text, fontSize: 16 },
  btn: { minHeight: 52, paddingHorizontal: 22, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { minHeight: 38, paddingHorizontal: 14, borderRadius: 10 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 17,
    textAlign: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.bg,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  big: { color: colors.text, fontSize: 68, fontWeight: '200', fontVariant: ['tabular-nums'], textAlign: 'center' },
  pad: { padding: 16, gap: 14 },
});
