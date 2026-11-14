import Native, { type StorageDir } from '../../modules/mapsms-native';
import { getSetting, setSetting } from './db';
import { DEFAULT_PACK_BASE_URL, FONT_BASE_URL, FONT_RANGES, FONTS, PACKS, type MapPack } from './mapPacks';

export type InstalledPack = { id: string; path: string; bytes: number; installedAt: number };

export const getPackBaseUrl = () => getSetting<string>('maps.baseUrl', DEFAULT_PACK_BASE_URL);
export const setPackBaseUrl = (u: string) => setSetting('maps.baseUrl', u.replace(/\/+$/, ''));
export const wifiOnly = () => getSetting<boolean>('maps.wifiOnly', true);
export const setWifiOnly = (v: boolean) => setSetting('maps.wifiOnly', v);

export function storageDirs(): StorageDir[] {
  return Native ? Native.getStorageDirs() : [];
}

/** SD card (removable) preferred; falls back to internal. User override stored. */
export function mapsRoot(): string | null {
  const dirs = storageDirs();
  if (!dirs.length) return null;
  const chosen = getSetting<string | null>('maps.root', null);
  const pick = dirs.find((d) => d.path === chosen) ?? dirs.find((d) => d.removable) ?? dirs[0];
  return `${pick.path}/maps`;
}

export function setMapsStorage(path: string) {
  setSetting('maps.root', path);
}

export function installedPacks(): InstalledPack[] {
  const list = getSetting<InstalledPack[]>('maps.installed', []);
  // Drop entries whose file vanished (SD removed / cleared).
  const n = Native;
  return n ? list.filter((p) => n.fileSize(p.path) > 0) : list;
}

function saveInstalled(list: InstalledPack[]) {
  setSetting('maps.installed', list);
}

async function ensureFonts(root: string) {
  if (!Native) return;
  for (const f of FONTS) {
    for (const r of FONT_RANGES) {
      const dest = `${root}/fonts/${f.stack}/${r}.pbf`;
      if (Native.fileSize(dest) > 0) continue;
      await Native.download(`font-${f.stack}-${r}`, `${FONT_BASE_URL}/${encodeURIComponent(f.remote)}/${r}.pbf`, dest);
    }
  }
}

export type Progress = { bytes: number; total: number };

/** Download (resumes from .part if interrupted). */
export async function downloadPack(pack: MapPack, onProgress: (p: Progress) => void): Promise<InstalledPack> {
  if (!Native) throw new Error('Map download needs Android app build.');
  const root = mapsRoot();
  if (!root) throw new Error('No storage available.');
  const sub = Native.addListener('onDownloadProgress', (e) => {
    if (e.id === pack.id) onProgress({ bytes: e.bytes, total: e.total });
  });
  try {
    await ensureFonts(root);
    const dest = `${root}/${pack.id}.pmtiles`;
    await Native.download(pack.id, `${getPackBaseUrl()}/${pack.id}.pmtiles`, dest);
    const entry: InstalledPack = { id: pack.id, path: dest, bytes: Native.fileSize(dest), installedAt: Date.now() };
    saveInstalled([...installedPacks().filter((p) => p.id !== pack.id), entry]);
    return entry;
  } finally {
    sub.remove();
  }
}

export function pauseDownload(id: string) {
  Native?.cancelDownload(id);
}

export function deletePack(id: string) {
  const list = installedPacks();
  const p = list.find((x) => x.id === id);
  if (p && Native) Native.deleteFile(p.path);
  saveInstalled(list.filter((x) => x.id !== id));
}

/** Packs older than 30 days -> suggest update. */
export const needsUpdate = (p: InstalledPack) => Date.now() - p.installedAt > 30 * 24 * 3600 * 1000;

export { PACKS };
