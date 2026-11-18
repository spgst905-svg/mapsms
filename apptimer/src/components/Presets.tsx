import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button, Card, Label, s } from './ui';
import type { Preset } from '../lib/presets';
import { colors } from '../theme';

type Props<T> = {
  title: string;
  presets: Preset<T>[];
  onSave: (name: string) => void;
  onLoad: (p: Preset<T>) => void;
  onDelete: (id: string) => void;
};

export function Presets<T>({ title, presets, onSave, onLoad, onDelete }: Props<T>) {
  const [name, setName] = useState('');
  return (
    <Card>
      <Label>{title}</Label>
      <View style={s.row}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name this setup"
          placeholderTextColor={colors.dim}
          style={s.textInput}
        />
        <Button
          small
          title="Save"
          disabled={!name.trim()}
          onPress={() => {
            onSave(name);
            setName('');
          }}
        />
      </View>
      {presets.length === 0 ? (
        <Text style={s.dim}>No saved setups yet. Same name overwrites.</Text>
      ) : (
        presets.map((p) => (
          <View key={p.id} style={s.between}>
            <Text style={[s.text, { flex: 1 }]} numberOfLines={1}>
              {p.name}
            </Text>
            <Button small tone="ghost" title="Load" onPress={() => onLoad(p)} />
            <Button small tone="ghost" title="✕" onPress={() => onDelete(p.id)} />
          </View>
        ))
      )}
    </Card>
  );
}
