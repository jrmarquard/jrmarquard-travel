#!/usr/bin/env tsx

/**
 * Generate a static map PNG for every trip that is missing one or whose trip
 * data has changed since the last run. Change detection uses a SHA-256 hash of
 * the trip JSON, stored as a sidecar `.hash` file next to the image.
 *
 * Outputs:
 *   ../site/public/maps/{trip-id}.png   — the map image
 *   ../site/public/maps/{trip-id}.hash  — SHA-256 of the source JSON
 *
 * Usage:
 *   tsx generate-maps.ts
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateTripMap, type Trip } from './map-core.js';

const TRIPS_DIR = resolve('../site/src/data/trips');
const MAPS_DIR = resolve('../site/public/maps');

const includeHome = process.argv.includes('--include-home');

mkdirSync(MAPS_DIR, { recursive: true });

const tripFiles = readdirSync(TRIPS_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => resolve(TRIPS_DIR, f));

if (tripFiles.length === 0) {
  console.log('No trip JSON files found.');
  process.exit(0);
}

let generated = 0;
let skipped = 0;
let failed = 0;

for (const filePath of tripFiles) {
  const content = readFileSync(filePath, 'utf-8');
  const trip: Trip = JSON.parse(content);
  const hash = createHash('sha256').update(content).digest('hex');

  const imgPath = resolve(MAPS_DIR, `${trip.id}.png`);
  const hashPath = resolve(MAPS_DIR, `${trip.id}.hash`);

  const storedHash = existsSync(hashPath) ? readFileSync(hashPath, 'utf-8').trim() : null;

  if (storedHash === hash && existsSync(imgPath)) {
    console.log(`✓  ${trip.id} — up to date`);
    skipped++;
    continue;
  }

  const reason = !existsSync(imgPath) ? 'new' : 'changed';
  console.log(`↻  ${trip.id} — ${reason}, generating…`);

  const ok = await generateTripMap(trip, imgPath, { includeHome });
  if (ok) {
    writeFileSync(hashPath, hash);
    console.log(`   → ${imgPath}`);
    generated++;
  } else {
    failed++;
  }
}

console.log(`\nDone: ${generated} generated, ${skipped} up to date, ${failed} skipped (no coords).`);
if (failed > 0) process.exit(1);
