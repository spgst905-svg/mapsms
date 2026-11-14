export const C = {
  bg: '#f6f7f9',
  card: '#ffffff',
  text: '#1b1f24',
  sub: '#5b636e',
  border: '#e3e6ea',
  primary: '#1565c0',
  danger: '#c62828',
  ok: '#1a7f37',
  warn: '#b58100',
};

export const S = {
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: C.border },
  h2: { fontSize: 18, fontWeight: '700' as const, color: C.text },
  sub: { color: C.sub, fontSize: 14 },
};
