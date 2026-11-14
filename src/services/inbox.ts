import Native, { type IncomingSms } from '../../modules/mapsms-native';
import { saveMessage } from './db';

type Listener = () => void;
const listeners = new Set<Listener>();

export function onInboxChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  listeners.forEach((l) => l());
}

/** Import MAPSMS texts already in phone inbox (catches ones received while app closed). */
export function syncInbox(limit = 300): number {
  if (!Native) return 0;
  let added = 0;
  for (const m of Native.readInbox(limit)) {
    if (saveMessage('in', m.address, m.body, m.date) != null) added++;
  }
  if (added) notify();
  return added;
}

/** Live listener while app process alive. Returns unsubscribe. */
export function startInboxListener(): () => void {
  if (!Native) return () => {};
  const sub = Native.addListener('onSmsReceived', (m: IncomingSms) => {
    if (saveMessage('in', m.address, m.body, m.date) != null) notify();
  });
  return () => sub.remove();
}
