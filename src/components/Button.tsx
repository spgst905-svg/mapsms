import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { C } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  color?: string;
  outline?: boolean;
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
  big?: boolean;
};

export default function Button({ title, onPress, color = C.primary, outline, disabled, busy, style, big }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.btn,
        big && styles.big,
        outline ? { borderColor: color, borderWidth: 2, backgroundColor: 'transparent' } : { backgroundColor: color },
        (disabled || busy) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={outline ? color : '#fff'} />
      ) : (
        <Text style={[styles.text, big && styles.bigText, outline && { color }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 48, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  big: { minHeight: 60 },
  text: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bigText: { fontSize: 18 },
});
