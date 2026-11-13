# MapSMS — Implementation Plan

Share accurate location via SMS. No server. Phone-only. Philippines.

## 1. Goals
- Precise GPS fix, offline.
- Send location by SMS (regular load, no data).
- Receive SMS → app reads it → shows pin on map.
- Zero backend. Zero internet required (except map tiles, cached).

## 2. Core Features (MVP)
1. **Locate me** — GPS fix, accuracy (± m) shown.
2. **Accuracy gate** — wait ≤ 20 m or 15 s timeout, send best fix.
3. **Send SMS** — direct send from app (Android) or native composer (iOS).
4. **SMS check / inbox** — app scans incoming SMS for MapSMS format, lists received locations.
5. **Map view** — pin + accuracy circle, offline tiles for PH.
6. **Contacts** — pick from phonebook, PH number validation (`+639XXXXXXXXX` / `09XXXXXXXXX`).
7. **Navigate** — open received pin in Google Maps / Waze.

## 3. SMS Message Format
Human-readable + machine-parsable. Recipient without app still understands.
```
MAPSMS 14.59951,120.98420 ±8m 14:32
https://maps.google.com/?q=14.59951,120.98420
Note: nasa gate ako
```
- Prefix `MAPSMS` = parser marker.
- 5 decimals ≈ 1.1 m precision.
- Keep ≤ 160 chars (1 SMS segment, 1 load charge).
- Optional Plus Code fallback.

## 4. Platform Reality (Important)
| Feature | Android | iOS |
|---|---|---|
| Get GPS offline | ✅ | ✅ |
| Send SMS silently from app | ✅ (`SEND_SMS`) | ❌ composer only, user taps Send |
| Read incoming SMS | ✅ (`RECEIVE_SMS`/`READ_SMS`) | ❌ not allowed |
| Auto-detect location SMS | ✅ | ❌ — user copy/pastes or taps link |

- **Recommendation:** Android first. Most PH users Android.
- iOS: send-only + paste-to-parse screen.
- Google Play restricts SMS permissions. Options:
  - Sideload APK (simplest, internal use).
  - Request Play policy exception.
  - Become default SMS app (heavy).
  - Use **SMS Retriever / User Consent API** — no permission, reads single matching SMS with user tap. Play-safe.

## 5. Tech Stack
| Layer | Choice |
|---|---|
| App | React Native (Expo dev build / bare) |
| Location | `expo-location` (high accuracy) |
| SMS send | `react-native-sms` / native module `SmsManager` (Android), `expo-sms` (iOS) |
| SMS read | Native Android module: `BroadcastReceiver` for `SMS_RECEIVED` |
| Map | `react-native-maps` + OSM offline tiles (MapLibre) |
| Storage | SQLite on device (received locations, history) |
| Contacts | `expo-contacts` |

## 6. Architecture (on-device only)
```
[App]
  ├─ LocationService  → best-fix logic
  ├─ MessageCodec     → encode/decode MAPSMS text
  ├─ SmsSender        → SmsManager / composer
  ├─ SmsReceiver      → native listener → parse → DB
  ├─ LocalDB (SQLite) → history, contacts favs
  └─ MapScreen        → offline tiles, pins
```

## 7. Folder Structure
```
mapsms/
  app/                 # screens: Home, Inbox, Map, Settings
  src/services/        # location, sms, codec, db
  src/components/      # Map, AccuracyBadge, ShareButton
  android/             # native SMS receiver module
  PLAN.md
```

## 8. Permissions & Privacy
- Android: `ACCESS_FINE_LOCATION`, `SEND_SMS`, `RECEIVE_SMS`, `READ_SMS`, `READ_CONTACTS`.
- iOS: location only.
- All data stays on phone.
- Confirm before each send (avoid accidental load usage).

## 9. Milestones
| # | Deliverable | Est. |
|---|---|---|
| M1 | RN scaffold, GPS + accuracy display | 2 d |
| M2 | MessageCodec + unit tests | 1 d |
| M3 | Send SMS (Android direct, iOS composer) | 2 d |
| M4 | Android SMS receiver + inbox | 3 d |
| M5 | Map view, offline PH tiles, navigate out | 3 d |
| M6 | Contacts, history, settings | 2 d |
| M7 | Real-device test (Globe, Smart, DITO) | 2 d |
| P2 | SOS, periodic auto-send, iOS paste parse | later |

## 10. Testing
- Codec: encode/decode round-trip, malformed SMS.
- Indoor/outdoor accuracy, Metro Manila + provincial.
- Airplane mode + SMS only.
- Networks: Globe, Smart, DITO, TNT, TM.
- Dual-SIM selection.

## 11. Open Questions
- Android only OK for MVP?
- Play Store or sideload APK?
- Auto-send to group (SOS) needed?
