import { useSyncExternalStore } from 'react';
import Storage from 'expo-sqlite/kv-store';

/** Tiny persisted external store (kv-store backed). */
export function createStore<T>(key: string, initial: T) {
  let value: T = initial;
  try {
    const raw = Storage.getItemSync(key);
    if (raw) value = { ...initial, ...JSON.parse(raw) };
  } catch {
    value = initial;
  }
  const listeners = new Set<() => void>();
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const get = () => value;
  const set = (patch: Partial<T> | ((v: T) => Partial<T>)) => {
    value = { ...value, ...(typeof patch === 'function' ? patch(value) : patch) };
    try {
      Storage.setItemSync(key, JSON.stringify(value));
    } catch {}
    listeners.forEach((l) => l());
  };
  const use = () => useSyncExternalStore(subscribe, get, get);
  return { get, set, use };
}
