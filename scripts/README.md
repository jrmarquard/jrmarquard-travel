# scripts

Data-processing scripts for the travel site. Run with `npx tsx <script>` or via the npm aliases below.

## Prerequisites

```
npm install
```

No API keys required. Geocoding uses the public Nominatim (OpenStreetMap) API.

---

## Scripts

### `enrich-coordinates.ts`

Geocodes any `Location` objects in a trip JSON that are missing `coordinates`, then writes the result back. Uses Nominatim with a progressive fallback strategy (name + region → name only) and deduplicates by `(geocodeName ?? name, country)` so the same place isn't looked up twice.

**Rate limit:** 1 request per second (Nominatim policy). Expect ~1 s per unique location.

```bash
# Update in-place
npx tsx enrich-coordinates.ts ../site/src/data/trips/fiji-diving-2026.json

# Write to a separate file
npx tsx enrich-coordinates.ts ../site/src/data/trips/fiji-diving-2026.json /tmp/fiji-enriched.json
```

If a location isn't found by Nominatim, set `geocodeName` on that object to an alternative search term and re-run.

---

### `generate-map.ts`

Generates a single static map PNG for one trip file.

```bash
npx tsx generate-map.ts <trip.json> [output.png]
# output defaults to ./map.png
```

```bash
npx tsx generate-map.ts ../site/src/data/trips/fiji-diving-2026.json ../site/public/maps/fiji-diving-2026.png
```

---

### `generate-maps.ts`

Batch variant of `generate-map.ts`. Scans all trip JSON files in `../site/src/data/trips/`, regenerates only those whose content has changed (detected via a SHA-256 sidecar `.hash` file), and writes PNGs to `../site/public/maps/`.

```bash
npx tsx generate-maps.ts
# or
npm run generate-maps
```

Run this after editing trip data or before deploying to keep the map images current.

---

## Map output

Both map scripts produce a PNG with:

- A blue polyline connecting stops in day order
- Green circle — first stop
- Red circle — last stop
- Blue circles — intermediate stops
- Location name labels above each named stop

Only stops listed as `primaryStopId` for each day are plotted. Transit stops (`in-air`, `at-sea`, `overland`) are connected by the route line but receive no label.
