export type Preset<T> = { id: string; name: string; config: T };

/** Save under `name`. Same name (case-insensitive) overwrites. Blank name -> list unchanged. */
export function upsertPreset<T>(list: Preset<T>[], name: string, config: T, id: string): Preset<T>[] {
  const clean = name.trim();
  if (!clean) return list;
  const i = list.findIndex((p) => p.name.toLowerCase() === clean.toLowerCase());
  const copy = JSON.parse(JSON.stringify(config)) as T;
  if (i >= 0) return list.map((p, j) => (j === i ? { ...p, name: clean, config: copy } : p));
  return [...list, { id, name: clean, config: copy }];
}

export function removePreset<T>(list: Preset<T>[], id: string): Preset<T>[] {
  return list.filter((p) => p.id !== id);
}
