import * as Contacts from 'expo-contacts';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '../components/Button';
import { deleteContact, emergencyContacts, listContacts, setEmergency, upsertContact, type Contact } from '../services/db';
import { formatPH, normalizePH } from '../services/phone';
import { C, S } from '../theme';

const MAX_EMERGENCY = 5;

export default function ContactsScreen() {
  const [items, setItems] = useState<Contact[]>(listContacts);
  const [name, setName] = useState('');
  const [num, setNum] = useState('');
  const reload = () => setItems(listContacts());

  const add = () => {
    const n = normalizePH(num);
    if (!n) return Alert.alert('Invalid number', 'Use 09XX XXX XXXX or +639XX XXX XXXX');
    upsertContact(name.trim() || formatPH(n), n);
    setName('');
    setNum('');
    reload();
  };

  const pick = async () => {
    const c = await Contacts.Contact.presentPicker();
    if (!c) return;
    const [phones, full] = await Promise.all([c.getPhones(), c.getFullName()]);
    const n = phones.map((p) => normalizePH(p.number ?? '')).find(Boolean);
    if (!n) return Alert.alert('No PH mobile number', `${full} has no valid PH mobile number.`);
    upsertContact(full || formatPH(n), n);
    reload();
  };

  const toggleSos = (c: Contact) => {
    if (!c.emergency && emergencyContacts().length >= MAX_EMERGENCY) {
      return Alert.alert('Limit reached', `Max ${MAX_EMERGENCY} emergency contacts (each SOS = 1 SMS each).`);
    }
    setEmergency(c.id, !c.emergency);
    reload();
  };

  const remove = (c: Contact) =>
    Alert.alert(`Remove ${c.name}?`, '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => (deleteContact(c.id), reload()) },
    ]);

  return (
    <FlatList
      style={S.screen}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      data={items}
      keyExtractor={(c) => String(c.id)}
      ListHeaderComponent={
        <View style={[S.card, { marginBottom: 8 }]}>
          <Text style={S.h2}>Add contact</Text>
          <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="09XX XXX XXXX" keyboardType="phone-pad" value={num} onChangeText={setNum} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Add" onPress={add} style={{ flex: 1 }} />
            <Button title="From phonebook" onPress={pick} outline style={{ flex: 1 }} />
          </View>
          <Text style={S.sub}>⭐ = SOS emergency contact (max {MAX_EMERGENCY}). Tap star to toggle.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={[S.card, styles.row]}>
          <Pressable onPress={() => toggleSos(item)} hitSlop={10}>
            <Text style={[styles.star, !item.emergency && { opacity: 0.25 }]}>⭐</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={S.sub}>{formatPH(item.number)}</Text>
          </View>
          <Pressable onPress={() => remove(item)} hitSlop={10}>
            <Text style={{ color: C.danger, fontWeight: '600' }}>Remove</Text>
          </Pressable>
        </View>
      )}
      ListEmptyComponent={<Text style={S.sub}>No contacts yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 48, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  star: { fontSize: 26 },
  name: { fontSize: 16, fontWeight: '700', color: C.text },
});
