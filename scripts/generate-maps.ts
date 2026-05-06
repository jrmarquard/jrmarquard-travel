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
import StaticMaps from 'staticmaps';

const TRIPS_DIR = resolve('../site/src/data/trips');
const MAPS_DIR = resolve('../site/public/maps');

// ---------------------------------------------------------------------------
// Minimal types (subset of site/src/schema/types.ts)
// ---------------------------------------------------------------------------

interface Coordinates { lat: number; lng: number; }
interface PlaceLocation { name: string; coordinates?: Coordinates; }
interface TransitLocation { kind: string; waypoints: PlaceLocation[]; }
interface Stop { id: string; location: PlaceLocation | TransitLocation; }
interface Day { primaryStopId: string; stops: Stop[]; }
interface Trip { id: string; title: string; days: Day[]; }

// ---------------------------------------------------------------------------
// Map generation
// ---------------------------------------------------------------------------

function getCoord(stop: Stop): [number, number] | null {
  const loc = stop.location;
  if ('kind' in loc) {
    for (const wp of loc.waypoints) {
      if (wp.coordinates) return [wp.coordinates.lng, wp.coordinates.lat];
    }
    return null;
  }
  if (loc.coordinates) return [loc.coordinates.lng, loc.coordinates.lat];
  return null;
}

function getStopName(stop: Stop): string {
  const loc = stop.location;
  return 'kind' in loc ? `${loc.kind} transit` : loc.name;
}

async function generateMap(trip: Trip, outputPath: string): Promise<boolean> {
  const stopPoints: Array<{ coord: [number, number]; name: string }> = [];

  for (const day of trip.days) {
    const primary = day.stops.find((s) => s.id === day.primaryStopId) ?? day.stops[0];
    if (!primary) continue;
    const coord = getCoord(primary);
    if (!coord) continue;
    const prev = stopPoints.at(-1);
    if (prev && prev.coord[0] === coord[0] && prev.coord[1] === coord[1]) continue;
    stopPoints.push({ coord, name: getStopName(primary) });
  }

  if (stopPoints.length === 0) {
    console.log(`  ⚠  No coordinates found — skipping "${trip.title}"`);
    return false;
  }

  stopPoints.forEach((p, i) =>
    console.log(`  ${i + 1}. ${p.name} [${p.coord[1].toFixed(4)}, ${p.coord[0].toFixed(4)}]`),
  );

  const map = new StaticMaps({ width: 1200, height: 600 });

  if (stopPoints.length > 1) {
    map.addLine({
      coords: stopPoints.map((p) => p.coord),
      color: '#3B82F6CC',
      width: 3,
    });
  }

  for (let i = 0; i < stopPoints.length; i++) {
    const isFirst = i === 0;
    const isLast = i === stopPoints.length - 1;
    map.addCircle({
      coord: stopPoints[i].coord,
      radius: 10,
      fill: isFirst ? '#22C55EDD' : isLast ? '#EF4444DD' : '#3B82F6DD',
      color: '#FFFFFF',
      width: 2,
    });
  }

  await map.render();
  await map.image.save(outputPath);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

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

  const ok = await generateMap(trip, imgPath);
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
