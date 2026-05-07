import StaticMaps from 'staticmaps';
import { computeLabelOffsets } from './label-placement.js';

// ---------------------------------------------------------------------------
// Minimal types (subset of site/src/schema/types.ts)
// ---------------------------------------------------------------------------

interface Coordinates { lat: number; lng: number; }
interface PlaceLocation { name: string; coordinates?: Coordinates; }
interface TransitLocation { kind: string; waypoints: PlaceLocation[]; }
export interface Stop { id: string; home?: boolean; location: PlaceLocation | TransitLocation; }
export interface Day { primaryStopId: string; stops: Stop[]; }
export interface Trip { id: string; title: string; days: Day[]; }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

const MAP_W = 1200;
const MAP_H = 800;
const PAD_X = Math.round(MAP_W * 0.1);
const PAD_Y = Math.round(MAP_H * 0.1);

export async function generateTripMap(
  trip: Trip,
  outputPath: string,
  { includeHome = false }: { includeHome?: boolean } = {},
): Promise<boolean> {
  const stopPoints: Array<{ coord: [number, number]; name: string; label: string | null }> = [];

  for (const day of trip.days) {
    const primary = day.stops.find((s) => s.id === day.primaryStopId) ?? day.stops[0];
    if (!primary) continue;
    if (!includeHome && primary.home) continue;
    const coord = getCoord(primary);
    if (!coord) continue;
    const prev = stopPoints.at(-1);
    if (prev && prev.coord[0] === coord[0] && prev.coord[1] === coord[1]) continue;
    stopPoints.push({ coord, name: getStopName(primary), label: getLabelName(primary) });
  }

  if (stopPoints.length === 0) {
    console.log(`  ⚠  No coordinates found — skipping "${trip.title}"`);
    return false;
  }

  stopPoints.forEach((p, i) =>
    console.log(`  ${i + 1}. ${p.name} [${p.coord[1].toFixed(4)}, ${p.coord[0].toFixed(4)}]`),
  );

  const map = new StaticMaps({ width: MAP_W, height: MAP_H, paddingX: PAD_X, paddingY: PAD_Y });

  if (stopPoints.length > 1) {
    map.addLine({ coords: stopPoints.map((p) => p.coord), color: '#3B82F6CC', width: 3 });
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

  // Dark-outline pass first (subtitle background), white fill on top.
  // Text renders after lines and before circles, so labels sit over the
  // route without obscuring the markers.
  for (const { coord, text, offsetX, offsetY } of computeLabelOffsets(stopPoints, MAP_W, MAP_H, PAD_X, PAD_Y)) {
    const base = { coord, text, size: 24, font: 'Arial', anchor: 'middle', offsetX, offsetY };
    map.addText({ ...base, fill: '#000000', color: '#000000', width: 8 });
    map.addText({ ...base, fill: '#FFFFFF', color: '#FFFFFF', width: 1 });
  }

  await map.render();
  await map.image.save(outputPath);
  return true;
}
