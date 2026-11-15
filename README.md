# MapSMS

Share accurate GPS location by plain SMS. No server, no mobile data. Android-first (tested target: POCO M8 5G, HyperOS 3 / Android 16). Philippines.

## Features
- **Share** — GPS best-fix (waits ≤ 20 m or 15 s), accuracy badge, sends 1 SMS (≤ 160 chars) with coords + accuracy + note (no links — carriers block them).
- **Inbox** — auto-reads incoming `MAPSMS` texts (even when app closed), shows on map.
- **Location detail** — offline map, distance + compass arrow, navigate (Google Maps / Waze), call.
- **SOS** — 3 s countdown, sends to up to 5 emergency contacts, repeats every 2/5/10/15 min via foreground service (screen off OK). Receiver phone gets loud full-screen alarm.
- **Offline maps** — NCR + CALABARZON + PH overview (PMTiles), saved to SD card (or phone storage), resumable download.
- **Phone setup check** — permissions, battery, HyperOS autostart guide.
- Dual-SIM picker, PH number validation, contacts from phonebook.

## SMS format
```
MAPSMS 14.59951,120.98420 ±8m 14:32
nasa gate ako
```
SOS: `MAPSMS SOS 14.59951,120.98420 ±8m 14:32 BAT 23%`. No web link: Globe/Smart block P2P SMS with URLs. Recipients without the app copy the coordinates into Google Maps.

## Build the APK (direct install)
Expo Go **cannot** send/read SMS — build an APK.

**Option A — GitHub Actions (no account needed):** Actions → *Build Android APK* → Run workflow → download `mapsms-apk` artifact.

**Option B — EAS cloud:**
```bash
npm install
npx eas-cli@latest build -p android --profile preview
```

**Option C — local (Android Studio / SDK installed):**
```bash
npm install
npx expo run:android --variant release
```

## Install on POCO / HyperOS
1. Open APK → allow "Install unknown apps" for your browser/file manager.
2. Open MapSMS → **Phone setup check** opens automatically. Fix every ❌.
3. **SMS permission blocked?** Settings → Apps → MapSMS → ⋮ (top right) → *Allow restricted settings* → back → Permissions → SMS → Allow.
4. Location → *Allow all the time* (SOS).
5. Battery saver → *No restrictions*. Autostart → ON. Lock app in Recents.
6. Other permissions → Send SMS → *Always allow*.

## Offline map packs
Packs are static `.pmtiles` files (OpenStreetMap via Protomaps), hosted on this repo's GitHub Release `maps-v1`:
- Run Actions → *Build offline map packs* once (also refreshes monthly).
- Or locally: `scripts/build-map-packs.sh` (needs `pmtiles` CLI).
- Repo must be **public** for the app to download (or change URL in app: Offline maps → Map source).

| Pack | Area | Approx |
|---|---|---|
| ph-overview | Whole PH, z0–9 | 35 MB |
| ncr | Metro Manila | 60 MB |
| calabarzon-south | Cavite, Laguna, Batangas | 150 MB |
| calabarzon-east | Rizal, Quezon | 150 MB |

## Dev
```bash
npm test          # codec, phone, geo, map style
npm run typecheck
npm run lint
```
Native Android code: `modules/mapsms-native` (Expo local module: SMS send/receive, inbox, SOS alarm, SD-card downloader).
