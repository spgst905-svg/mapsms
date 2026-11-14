#!/usr/bin/env bash
# Build offline map packs (PMTiles) for MapSMS from the Protomaps daily planet build.
# Only downloads needed tiles via HTTP range requests (~few hundred MB total).
# Usage: scripts/build-map-packs.sh [outdir]
# Requires: pmtiles CLI (https://github.com/protomaps/go-pmtiles/releases)
# Keep bboxes in sync with src/services/mapPacks.ts
set -euo pipefail
OUT="${1:-dist/maps}"
mkdir -p "$OUT"

if [[ -z "${PLANET_URL:-}" ]]; then
  # Latest successful daily build (try today back 7 days).
  for i in $(seq 0 7); do
    D=$(date -u -d "-$i day" +%Y%m%d)
    if curl -sfI "https://build.protomaps.com/$D.pmtiles" >/dev/null; then
      PLANET_URL="https://build.protomaps.com/$D.pmtiles"; break
    fi
  done
fi
: "${PLANET_URL:?no planet build found}"
echo "Source: $PLANET_URL"

extract() { # id bbox maxzoom
  echo "==> $1 ($2, z0-$3)"
  pmtiles extract "$PLANET_URL" "$OUT/$1.pmtiles" --bbox="$2" --maxzoom="$3" --download-threads=4
  ls -lh "$OUT/$1.pmtiles"
}

extract ph-overview      "116.9,4.5,126.7,21.2"     9
extract ncr              "120.9,14.34,121.14,14.79" 15
extract calabarzon-south "120.55,13.48,121.65,14.5" 15
extract calabarzon-east  "121.1,13.15,122.75,15.25" 15
