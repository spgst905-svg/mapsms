import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOfflineStyle } from '../src/services/mapStyle.ts';

test('style: local pmtiles + glyphs, fonts renamed, no icons', () => {
  const s = buildOfflineStyle('/sd/maps', [
    { id: 'ncr', path: '/sd/maps/ncr.pmtiles' },
    { id: 'ph-overview', path: '/sd/maps/ph-overview.pmtiles' },
  ]);
  assert.equal(s.glyphs, 'file:///sd/maps/fonts/{fontstack}/{range}.pbf');
  assert.deepEqual(Object.keys(s.sources), ['ph-overview', 'ncr']);
  assert.equal((s.sources.ncr as { url: string }).url, 'pmtiles://file:///sd/maps/ncr.pmtiles');
  const json = JSON.stringify(s.layers);
  assert.ok(!json.includes('Noto Sans Regular'));
  assert.ok(json.includes('NotoSansRegular'));
  assert.ok(!json.includes('icon-image'));
  const ids = new Set(s.layers.map((l) => l.id));
  assert.equal(ids.size, s.layers.length, 'unique layer ids');
  const ncrLayers = s.layers.filter((l) => 'source' in l && l.source === 'ncr');
  assert.ok(ncrLayers.length > 10 && ncrLayers.every((l) => (l.minzoom ?? 0) >= 9));
});

test('style: no packs -> background only', () => {
  const s = buildOfflineStyle('/x', []);
  assert.equal(s.layers.length, 1);
});
