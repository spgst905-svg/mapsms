import * as SQLite from 'expo-sqlite';
import { decode } from './codec';
import { sameNumber } from './phone';

export type Contact = { id: number; name: string; number: string; emergency: number };
export type Message = {
  id: number;
  direction: 'in' | 'out';
  address: string;
  body: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  sos: number;
  battery: number | null;
  note: string | null;
  date: number;
  read: number;
};

let _db: SQLite.SQLiteDatabase | null = null;

export function db(): SQLite.SQLiteDatabase {
  if (_db) return _db;
  _db = SQLite.openDatabaseSync('mapsms.db');
  _db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      number TEXT NOT NULL UNIQUE,
      emergency INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL,
      address TEXT NOT NULL,
      body TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      accuracy REAL,
      sos INTEGER NOT NULL DEFAULT 0,
      battery INTEGER,
      note TEXT,
      date INTEGER NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      UNIQUE(direction, address, date)
    );
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return _db;
}

// ---------- key/value settings ----------
export function getSetting<T>(key: string, fallback: T): T {
  const row = db().getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: unknown): void {
  db().runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
}

// ---------- contacts ----------
export function listContacts(): Contact[] {
  return db().getAllSync<Contact>('SELECT * FROM contacts ORDER BY emergency DESC, name COLLATE NOCASE');
}

export function emergencyContacts(): Contact[] {
  return db().getAllSync<Contact>('SELECT * FROM contacts WHERE emergency = 1 ORDER BY name');
}

export function upsertContact(name: string, number: string, emergency = false): void {
  db().runSync(
    `INSERT INTO contacts (name, number, emergency) VALUES (?, ?, ?)
     ON CONFLICT(number) DO UPDATE SET name = excluded.name`,
    [name, number, emergency ? 1 : 0],
  );
}

export function setEmergency(id: number, on: boolean): void {
  db().runSync('UPDATE contacts SET emergency = ? WHERE id = ?', [on ? 1 : 0, id]);
}

export function deleteContact(id: number): void {
  db().runSync('DELETE FROM contacts WHERE id = ?', [id]);
}

export function nameFor(address: string): string | null {
  const c = listContacts().find((c) => sameNumber(c.number, address));
  return c?.name ?? null;
}

// ---------- messages ----------
/** Parse + store. Returns stored row id, or null if not a MAPSMS text / duplicate. */
export function saveMessage(direction: 'in' | 'out', address: string, body: string, date: number): number | null {
  const d = decode(body);
  if (!d) return null;
  const r = db().runSync(
    `INSERT OR IGNORE INTO messages (direction, address, body, lat, lng, accuracy, sos, battery, note, date, read)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [direction, address, body, d.lat, d.lng, d.accuracy, d.sos ? 1 : 0, d.battery, d.note, date, direction === 'out' ? 1 : 0],
  );
  return r.changes > 0 ? r.lastInsertRowId : null;
}

export function listMessages(direction?: 'in' | 'out', limit = 200): Message[] {
  return direction
    ? db().getAllSync<Message>('SELECT * FROM messages WHERE direction = ? ORDER BY date DESC LIMIT ?', [direction, limit])
    : db().getAllSync<Message>('SELECT * FROM messages ORDER BY date DESC LIMIT ?', [limit]);
}

export function getMessage(id: number): Message | null {
  return db().getFirstSync<Message>('SELECT * FROM messages WHERE id = ?', [id]);
}

export function markRead(id: number): void {
  db().runSync('UPDATE messages SET read = 1 WHERE id = ?', [id]);
}

export function unreadCount(): number {
  return db().getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM messages WHERE direction = 'in' AND read = 0")?.n ?? 0;
}

export function deleteMessage(id: number): void {
  db().runSync('DELETE FROM messages WHERE id = ?', [id]);
}
