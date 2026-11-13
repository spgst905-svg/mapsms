# MapSMS — Implementation Plan

Share accurate location via SMS. Web + mobile.

## 1. Goals
- Get precise device location fast.
- Send location by SMS, one tap.
- Work offline / no data (SMS fallback).
- Recipient needs no app — plain link + coordinates.

## 2. Core Features (MVP)
1. **Locate me** — GPS fix, accuracy radius shown (± meters).
2. **Accuracy gate** — wait for fix ≤ 20 m or timeout (15 s), then send best fix.
3. **Share via SMS**
   - Message: `I'm here: https://maps.google.com/?q=LAT,LNG (±8m) 14:32` + plus code + optional note.
   - Mobile: native SMS composer (`sms:` URI / native API).
   - Web: `sms:` link on phones; server-sent SMS (Twilio) on desktop.
4. **Contacts** — pick from phone contacts or type number. Save favorites.
5. **Map view** — show pin + accuracy circle.
6. **Live share (phase 2)** — periodic SMS/link updates for N minutes.
7. **SOS mode (phase 2)** — one button, send to emergency contacts.

## 3. Location Accuracy Strategy
- `enableHighAccuracy: true` (GPS, not cell/Wi-Fi only).
- Use `watchPosition`, keep best reading by `accuracy`.
- Discard stale fixes (> 30 s old).
- Show accuracy to user before sending.
- Include altitude/floor if available.
- Include **Plus Code** (works without street address).
- Optional reverse geocode → street address.
- Offline: coords + plus code still work in SMS.

## 4. Tech Stack
| Layer | Choice | Why |
|---|---|---|
| App | React Native + Expo | One codebase: iOS, Android, Web |
| Location | `expo-location` / browser Geolocation API | High accuracy, permissions |
| SMS (device) | `expo-sms` / `sms:` URI | No cost, works without data |
| SMS (server) | Twilio API | Desktop web, live share, SOS |
| Map | `react-native-maps` / Leaflet + OpenStreetMap (web) | Free tiles |
| Backend | Node.js + Express (serverless OK) | Twilio proxy, short links |
| DB | SQLite/Postgres (phase 2) | Live-share sessions |
| Plus Codes | `open-location-code` lib | Offline encoding |

## 5. Architecture
```
[App: RN/Expo]
  ├─ LocationService  → best-fix logic
  ├─ MessageBuilder   → SMS text format
  ├─ SmsService       → native composer | backend
  └─ ContactsService
[Backend: Node]
  ├─ POST /sms/send   → Twilio
  ├─ POST /share      → short link + live session
  └─ GET  /l/:id      → recipient map page
```

## 6. Folder Structure
```
mapsms/
  app/            # Expo screens
  src/services/   # location, sms, contacts
  src/components/ # Map, ShareButton, AccuracyBadge
  server/         # Express API
  PLAN.md
```

## 7. Permissions & Privacy
- Request location only on tap.
- iOS: `NSLocationWhenInUseUsageDescription`.
- Android: `ACCESS_FINE_LOCATION`, `READ_CONTACTS`.
- No location stored server-side in MVP.
- Live share: auto-expire, revocable link.
- Rate-limit server SMS (abuse prevention).

## 8. Milestones
| # | Deliverable | Est. |
|---|---|---|
| M1 | Expo scaffold, location + accuracy display | 2 d |
| M2 | Message builder + native SMS share | 2 d |
| M3 | Map view, contacts, favorites | 3 d |
| M4 | Web build + Twilio backend | 3 d |
| M5 | Testing (real devices, indoor/outdoor) | 2 d |
| M6 | Live share + SOS | 4 d |

## 9. Testing
- Unit: message builder, best-fix selection.
- Device: Android + iOS, indoor/outdoor accuracy.
- No-data mode: airplane + SMS only.
- Web: Chrome/Safari mobile, desktop.

## 10. Open Questions
- Need server SMS, or device-only?
- Target platforms priority: Android, iOS, web?
- Live tracking needed in MVP?
- SMS cost budget (Twilio)?
- Region/country for numbers?
