import * as Contacts from 'expo-contacts';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AccuracyBadge from '../../components/AccuracyBadge';
import Button from '../../components/Button';
import { encode } from '../../services/codec';
import { listContacts, upsertContact, type Contact } from '../../services/db';
import { ensurePermission, getBestFix, type Fix } from '../../services/location';
import { requestSmsPermissions } from '../../services/permissions';
import { formatPH, normalizePH } from '../../services/phone';
import { sendText } from '../../services/sms';
import { C, S } from '../../theme';

export default function ShareScreen() {
  const [fix, setFix] = useState<Fix | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [typed, setTyped] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => setContacts(listContacts()), []));

  const locate = async () => {
    setError(null);
    if (!(await ensurePermission())) {
      setError('Location permission denied. Enable in Settings.');
      return;
    }
    setBusy(true);
    const best = await getBestFix(setFix);
    setBusy(false);
    if (!best) setError('No GPS fix. Go near window / outdoors, try again.');
  };

  const toggle = (n: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const addTyped = () => {
    const n = normalizePH(typed);
    if (!n) {
      Alert.alert('Invalid number', 'Use PH mobile: 09XX XXX XXXX or +639XX XXX XXXX');
      return;
    }
    setSelected((s) => new Set(s).add(n));
    setTyped('');
  };

  const pickContact = async () => {
    const c = await Contacts.Contact.presentPicker();
    if (!c) return;
    const phones = await c.getPhones();
    const name = await c.getFullName();
    const nums = phones.map((p) => normalizePH(p.number ?? '')).filter((x): x is string => !!x);
    if (!nums.length) {
      Alert.alert('No PH mobile number', `${name} has no valid PH mobile number.`);
      return;
    }
    upsertContact(name || nums[0], nums[0]);
    setContacts(listContacts());
    setSelected((s) => new Set(s).add(nums[0]));
  };

  const text = fix ? encode(fix, { note: note.trim() || undefined }) : '';

  const send = async () => {
    if (!fix || !selected.size) return;
    await requestSmsPermissions();
    const nums = [...selected];
    Alert.alert('Send location?', `${nums.length} SMS · uses regular load\n\n${nums.map(formatPH).join('\n')}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setSending(true);
          const res = await sendText(nums, text);
          setSending(false);
          const failed = res.filter((r) => !r.ok);
          if (!failed.length) {
            Alert.alert('Sent ✅', `Location sent to ${res.length}.`);
            setSelected(new Set());
          } else {
            Alert.alert('Some failed', failed.map((f) => `${formatPH(f.number)}: ${f.error}`).join('\n'));
          }
        },
      },
    ]);
  };

  const nameOf = (n: string) => contacts.find((c) => c.number === n)?.name;

  return (
    <ScrollView style={S.screen} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <View style={S.card}>
        <Text style={S.h2}>1. Your location</Text>
        {fix ? (
          <>
            <Text style={styles.coords}>
              {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}
            </Text>
            <AccuracyBadge meters={fix.accuracy} />
            <Text style={styles.center}>
              {new Date(fix.timestamp).toLocaleTimeString()}
              {fix.altitude != null ? ` · alt ${Math.round(fix.altitude)} m` : ''}
            </Text>
          </>
        ) : (
          <Text style={S.sub}>Tap “Locate me”. Works offline (GPS only).</Text>
        )}
        {busy && <Text style={styles.center}>Improving accuracy… (up to 15 s)</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        <Button title={busy ? 'Locating…' : fix ? 'Refresh location' : 'Locate me'} onPress={locate} busy={busy} />
      </View>

      <View style={S.card}>
        <Text style={S.h2}>2. Send to</Text>
        <View style={styles.chips}>
          {contacts.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => toggle(c.number)}
              style={[styles.chip, selected.has(c.number) && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected.has(c.number) && styles.chipTextOn]}>
                {c.emergency ? '⭐ ' : ''}
                {c.name}
              </Text>
            </Pressable>
          ))}
          {[...selected]
            .filter((n) => !nameOf(n))
            .map((n) => (
              <Pressable key={n} onPress={() => toggle(n)} style={[styles.chip, styles.chipOn]}>
                <Text style={styles.chipTextOn}>{formatPH(n)} ✕</Text>
              </Pressable>
            ))}
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="09XX XXX XXXX"
            keyboardType="phone-pad"
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={addTyped}
          />
          <Button title="Add" onPress={addTyped} outline />
        </View>
        <Button title="Pick from phonebook" onPress={pickContact} outline />
      </View>

      <View style={S.card}>
        <Text style={S.h2}>3. Note (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. nasa gate ako"
          value={note}
          onChangeText={setNote}
          maxLength={60}
        />
        {fix && (
          <>
            <Text style={styles.preview}>{text}</Text>
            <Text style={S.sub}>{text.length}/160 chars · 1 SMS</Text>
          </>
        )}
      </View>

      <Button
        big
        title={selected.size ? `Send SMS to ${selected.size}` : 'Choose recipient'}
        onPress={send}
        disabled={!fix || !selected.size}
        busy={sending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 14, paddingBottom: 40 },
  coords: { fontSize: 22, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center', color: C.sub },
  error: { color: C.danger, textAlign: 'center', fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.text },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 48, fontSize: 16, backgroundColor: '#fff' },
  preview: { fontFamily: 'monospace', fontSize: 12, backgroundColor: '#f0f2f4', padding: 10, borderRadius: 8, color: C.text },
});
