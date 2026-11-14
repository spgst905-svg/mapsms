import { layers, namedFlavor } from '@protomaps/basemaps';
import type { LayerSpecification, StyleSpecification } from '@maplibre/maplibre-react-native';
import { FONTS } from './mapPacks';

const OVERVIEW_MAX = 9;

/** Deep-replace font names ("Noto Sans Regular" -> "NotoSansRegular"). */
function renameFonts<T>(v: T): T {
  if (typeof v === 'string') {
    const f = FONTS.find((x) => x.remote === v);
    return (f ? f.stack : v) as T;
  }
  if (Array.isArray(v)) return v.map(renameFonts) as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = renameFonts(val);
    return out as T;
  }
  return v;
}

function packLayers(sourceId: string, zoom: { min?: number; max?: number }): LayerSpecification[] {
  return (layers(sourceId, namedFlavor('light'), { lang: 'en' }) as LayerSpecification[])
    .filter((l) => l.type !== 'background' || sourceId === 'ph-overview')
    .map((l) => {
      const copy = renameFonts({ ...l, id: `${sourceId}-${l.id}` }) as LayerSpecification & {
        layout?: Record<string, unknown>;
        minzoom?: number;
        maxzoom?: number;
      };
      // No sprite sheet offline: drop POI icons, keep labels.
      if (copy.layout && 'icon-image' in copy.layout) {
        const { ['icon-image']: _drop, ...rest } = copy.layout;
        copy.layout = rest;
      }
      if (zoom.min != null) copy.minzoom = Math.max(copy.minzoom ?? 0, zoom.min);
      if (zoom.max != null) copy.maxzoom = Math.min(copy.maxzoom ?? 24, zoom.max);
      return copy;
    });
}

/**
 * Offline style from downloaded PMTiles on device/SD.
 * Overview pack renders below zoom 9; regional packs from zoom 9 up.
 */
export function buildOfflineStyle(mapsDir: string, installed: { id: string; path: string }[]): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    glyphs: `file://${mapsDir}/fonts/{fontstack}/{range}.pbf`,
    sources: {},
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#e9e6df' } }],
  };
  const ordered = [...installed].sort((a, b) => (a.id === 'ph-overview' ? -1 : b.id === 'ph-overview' ? 1 : 0));
  for (const p of ordered) {
    style.sources[p.id] = {
      type: 'vector',
      url: `pmtiles://file://${p.path}`,
      attribution: '© OpenStreetMap contributors · Protomaps',
    };
    const overview = p.id === 'ph-overview';
    style.layers.push(...packLayers(p.id, overview && installed.length > 1 ? { max: OVERVIEW_MAX + 0.5 } : overview ? {} : { min: OVERVIEW_MAX }));
  }
  return style;
}
