#!/usr/bin/env tsx

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import StaticMaps from 'staticmaps';

const [, , inputArg, outputArg] = process.argv;

if (!inputArg) {
  console.error('Usage: tsx generate-map.ts <trip.json> [output.png]');
  process.exit(1);
}

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg ?? 'map.png');

// Minimal types mirroring site/src/schema/types.ts
interface Coordinates {
  lat: number;
  lng: number;
}

interface PlaceLocation {
  name: string;
  coordinates?: Coordinates;
}

interface TransitLocation {
  kind: 'in-air' | 'at-sea' | 'overland';
  waypoints: PlaceLocation[];
}

interface Stop {
  id: string;
  location: PlaceLocation | TransitLocation;
}

interface Day {
  primaryStopId: string;
  stops: Stop[];
}

interface Trip {
  title: string;
  days: Day[];
}

const trip: Trip = JSON.parse(readFileSync(inputPath, 'utf-8'));

// Returns [lng, lat] as required by staticmaps (GeoJSON coordinate order)
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

function getLabelName(stop: Stop): string | null {
  const loc = stop.location;
  return 'kind' in loc ? null : loc.name;
}

// Collect primary-stop coords in day order; skip consecutive duplicates
const stopPoints: Array<{ coord: [number, number]; name: string; label: string | null }> = [];

for (const day of trip.days) {
  const primary =
    day.stops.find((s) => s.id === day.primaryStopId) ?? day.stops[0];
  if (!primary) continue;

  const coord = getCoord(primary);
  if (!coord) continue;

  const prev = stopPoints.at(-1);
  if (prev && prev.coord[0] === coord[0] && prev.coord[1] === coord[1])
    continue;

  stopPoints.push({ coord, name: getStopName(primary), label: getLabelName(primary) });
}

if (stopPoints.length === 0) {
  console.error(
    'No coordinates found in trip data. Ensure stops have coordinates.',
  );
  process.exit(1);
}

console.log(`Generating map for "${trip.title}" with ${stopPoints.length} stop(s)…`);
stopPoints.forEach((p, i) =>
  console.log(
    `  ${i + 1}. ${p.name} [${p.coord[1].toFixed(4)}, ${p.coord[0].toFixed(4)}]`,
  ),
);

const map = new StaticMaps({ width: 1200, height: 800 });

// Route polyline
if (stopPoints.length > 1) {
  map.addLine({
    coords: stopPoints.map((p) => p.coord),
    color: '#3B82F6CC',
    width: 3,
  });
}

// Stop markers: green = start, red = end, blue = intermediate
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

// Location labels — white halo first, then dark text on top.
// Text renders after lines and before circles, so halos cleanly
// cover route lines without obscuring the markers.
for (const { coord, label } of stopPoints) {
  if (!label) continue;
  const base = { coord, text: label, size: 11, font: 'Arial', anchor: 'middle', offsetX: 0, offsetY: 20 };
  map.addText({ ...base, fill: '#FFFFFF', color: '#FFFFFF', width: 4 });
  map.addText({ ...base, fill: '#1F2937', color: '#FFFFFF', width: 1 });
}

await map.render();
await map.image.save(outputPath);

console.log(`Map saved to: ${outputPath}`);
