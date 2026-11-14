import { StyleSheet, Text, View } from 'react-native';

export function accuracyLevel(m: number): { label: string; color: string } {
  if (m <= 10) return { label: 'Excellent', color: '#1a7f37' };
  if (m <= 20) return { label: 'Good', color: '#4c9a2a' };
  if (m <= 50) return { label: 'Fair', color: '#b58100' };
  return { label: 'Poor', color: '#c62828' };
}

export default function AccuracyBadge({ meters }: { meters: number }) {
  const { label, color } = accuracyLevel(meters);
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>±{Math.round(meters)} m · {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, alignSelf: 'center' },
  text: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
