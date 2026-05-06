#!/usr/bin/env tsx

/**
 * Enrich a trip JSON file with coordinates for any location objects that are
 * missing them. Uses the Nominatim (OpenStreetMap) geocoding API — no key
 * needed, but rate-limited to 1 request per second per their usage policy.
 *
 * Usage:
 *   tsx enrich-coordinates.ts <trip.json> [output.json]
 *
 * If no output path is given the input file is updated in-place.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , inputArg, outputArg] = process.argv;

if (!inputArg) {
  console.error('Usage: tsx enrich-coordinates.ts <trip.json> [output.json]');
  process.exit(1);
}

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg ?? inputArg);

// ---------------------------------------------------------------------------
// Nominatim geocoding
// ---------------------------------------------------------------------------

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function nominatimSearch(q: string, countrycodes?: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  if (countrycodes) url.searchParams.set('countrycodes', countrycodes);

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'jrmarquard-travel-enrich/1.0 (github.com/jrmarquard/jrmarquard-travel)',
    },
  });

  if (!res.ok) {
    console.warn(`  Nominatim error ${res.status} for "${q}"`);
    return null;
  }

  const results: NominatimResult[] = await res.json();
  if (results.length === 0) return null;

  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

// Try progressively simpler queries, always constraining by country code.
async function geocode(
  name: string,
  country?: string,
  region?: string,
): Promise<{ lat: number; lng: number } | null> {
  const cc = country?.toLowerCase();

  // 1. name + region, constrained to country code
  if (region && cc) {
    const result = await nominatimSearch(`${name}, ${region}`, cc);
    if (result) return result;
    await sleep(1100);
  }

  // 2. name only, constrained to country code
  if (cc) {
    const result = await nominatimSearch(name, cc);
    if (result) return result;
    await sleep(1100);
  }

  // 3. name + country name (free text, no code constraint) — last resort
  // Skipped intentionally: without a country constraint we risk wrong-country hits.

  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Walk the trip and collect location objects missing coordinates
// ---------------------------------------------------------------------------

interface Coordinates {
  lat: number;
  lng: number;
}

interface PlaceLocation {
  name: string;
  region?: string;
  country?: string;
  countryName?: string;
  coordinates?: Coordinates;
}

// Dedup key: (name, country) — region is often too specific for Nominatim.
// Multiple location objects that share the same key will all receive the same coords.
interface Group {
  name: string;
  country?: string;
  region?: string;
  locs: PlaceLocation[];
}

function collectGroups(obj: unknown, groups: Map<string, Group>): void {
  if (obj === null || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (const item of obj) collectGroups(item, groups);
    return;
  }

  const record = obj as Record<string, unknown>;

  // Detect a plain location object: has a string "name", no "kind", no existing coordinates.
  // A location has a compact schema (name, optional region/country/coordinates) with no
  // other domain fields. Non-location objects (trips, segments, stops) also have "name"
  // but carry extra fields like "id", "type", "status" etc. — we recurse into those.
  const hasLocationShape =
    typeof record['name'] === 'string' &&
    typeof record['kind'] === 'undefined' &&
    typeof record['coordinates'] === 'undefined' &&
    typeof record['id'] === 'undefined' &&
    typeof record['type'] === 'undefined';

  if (hasLocationShape) {
    const loc = record as unknown as PlaceLocation;
    const name = loc.name.trim();

    // Skip placeholder / empty names
    if (name === '' || name === '???' || name === 'unknown') {
      return;
    }

    // Skip if no country — can't constrain search so risk wrong-country hits
    if (loc.country) {
      const key = `${name}||${loc.country}`;
      const existing = groups.get(key);
      if (existing) {
        existing.locs.push(loc);
      } else {
        groups.set(key, { name, country: loc.country, region: loc.region, locs: [loc] });
      }
    }
    // Don't recurse into a location object's own fields
    return;
  }

  for (const value of Object.values(record)) {
    collectGroups(value, groups);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const trip = JSON.parse(readFileSync(inputPath, 'utf-8'));

const groups: Map<string, Group> = new Map();
collectGroups(trip, groups);

if (groups.size === 0) {
  console.log('All locations already have coordinates — nothing to do.');
  process.exit(0);
}

console.log(`Found ${groups.size} unique location(s) missing coordinates:\n`);
for (const g of groups.values()) {
  const detail = [g.region, g.country].filter(Boolean).join(', ');
  console.log(`  - ${g.name}${detail ? ` (${detail})` : ''}`);
}
console.log();

let enriched = 0;
let failed = 0;
const groupList = Array.from(groups.values());

for (let i = 0; i < groupList.length; i++) {
  const g = groupList[i];
  const label = [g.name, g.region, g.country].filter(Boolean).join(', ');
  process.stdout.write(`Geocoding (${i + 1}/${groupList.length}): "${label}" … `);

  const coords = await geocode(g.name, g.country, g.region);

  if (coords) {
    for (const loc of g.locs) {
      loc.coordinates = { lat: coords.lat, lng: coords.lng };
    }
    console.log(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    enriched++;
  } else {
    console.log('not found');
    failed++;
  }

  // Nominatim rate limit: 1 req/s. geocode() already sleeps between retries;
  // sleep here covers the gap between the final attempt and the next group.
  if (i < groupList.length - 1) await sleep(1100);
}

writeFileSync(outputPath, JSON.stringify(trip, null, 2) + '\n');

console.log(`\nDone: ${enriched} enriched, ${failed} not found.`);
console.log(`Saved to: ${outputPath}`);
