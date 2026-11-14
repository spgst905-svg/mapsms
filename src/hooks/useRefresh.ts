import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { onInboxChange } from '../services/inbox';

/** Re-run loader on focus and on inbox change. */
export function useLive<T>(load: () => T): [T, () => void] {
  const [val, setVal] = useState<T>(load);
  const refresh = useCallback(() => setVal(load()), [load]);
  useFocusEffect(refresh);
  useEffect(() => onInboxChange(refresh), [refresh]);
  return [val, refresh];
}
