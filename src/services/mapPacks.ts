import type { BBox } from './geo';

export type MapPack = {
  id: string;
  name: string;
  description: string;
  bbox: BBox;
  maxzoom: number;
  estMB: number;
};

/** Must match scripts/build-map-packs.sh. */
export const PACKS: MapPack[] = [
  {
    id: 'ph-overview',
    name: 'Philippines overview',
    description: 'Whole country, cities & highways (zoom 0–9)',
    bbox: [116.9, 4.5, 126.7, 21.2],
    maxzoom: 9,
    estMB: 35,
  },
  {
    id: 'ncr',
    name: 'Metro Manila (NCR)',
    description: 'All 17 LGUs, street level',
    bbox: [120.9, 14.34, 121.14, 14.79],
    maxzoom: 15,
    estMB: 60,
  },
  {
    id: 'calabarzon-south',
    name: 'Cavite · Laguna · Batangas',
    description: 'Street level',
    bbox: [120.55, 13.48, 121.65, 14.5],
    maxzoom: 15,
    estMB: 150,
  },
  {
    id: 'calabarzon-east',
    name: 'Rizal · Quezon',
    description: 'Street level, incl. Polillo',
    bbox: [121.1, 13.15, 122.75, 15.25],
    maxzoom: 15,
    estMB: 150,
  },
];

/** Fonts used by style (spaces removed from names to keep file paths simple). */
export const FONTS: { stack: string; remote: string }[] = [
  { stack: 'NotoSansRegular', remote: 'Noto Sans Regular' },
  { stack: 'NotoSansMedium', remote: 'Noto Sans Medium' },
  { stack: 'NotoSansItalic', remote: 'Noto Sans Italic' },
];
/** Basic Latin, Latin-1, Latin Ext-A, general punctuation — covers Filipino/English place names. */
export const FONT_RANGES = ['0-255', '256-511', '8192-8447'];
export const FONT_BASE_URL = 'https://raw.githubusercontent.com/protomaps/basemaps-assets/main/fonts';

export const DEFAULT_PACK_BASE_URL = 'https://github.com/spgst905-svg/mapsms/releases/download/maps-v1';
