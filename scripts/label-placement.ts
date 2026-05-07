// Computes (offsetX, offsetY) for map labels so each label shifts away from
// its nearest neighbour and placed labels don't overlap each other.
//
// Replicates StaticMaps' Web Mercator pixel math (same formulas as
// staticmaps/dist/helper/geo.js + xToPx/yToPx) so the computed offsets are
// in the same pixel space as the rendered image.

const TILE_SIZE = 256;
const MARKER_RADIUS = 10;           // must match the circle radius in map scripts
const FONT_SIZE_PX = 11 * (4 / 3); // 11pt → px
const CHAR_WIDTH = FONT_SIZE_PX * 0.55;   // empirical average char width, Arial 11pt
const LABEL_H = FONT_SIZE_PX * 1.5;       // visual height including line spacing
const COLL_PAD = 4;                        // extra buffer per box side for collision checks
const BASE_DIST = MARKER_RADIUS + LABEL_H + 2; // minimum center-to-baseline distance
const DIST_STEP = 16;
const MAX_TRIES = 8;

// --- Web Mercator tile math (mirrors geo.js) ---

function lonToX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * 2 ** zoom;
}

function latToY(lat: number, zoom: number): number {
  return (
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
      ) /
        Math.PI) /
      2) *
    2 ** zoom
  );
}

// Find the highest zoom where the coordinate bounding box fits in the image.
// Mirrors StaticMaps' calculateZoom logic (padding = 0).
function calcZoom(coords: [number, number][], w: number, h: number): number {
  if (coords.length <= 1) return 12;
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLon = Math.min(...lngs), maxLon = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  for (let z = 17; z >= 1; z--) {
    const fw = (lonToX(maxLon, z) - lonToX(minLon, z)) * TILE_SIZE;
    const fh = (latToY(minLat, z) - latToY(maxLat, z)) * TILE_SIZE;
    if (fw <= w && fh <= h) return z;
  }
  return 1;
}

// Mirrors StaticMaps' xToPx / yToPx.
function toPx(
  coord: [number, number],
  cX: number,
  cY: number,
  zoom: number,
  w: number,
  h: number,
): [number, number] {
  return [
    (lonToX(coord[0], zoom) - cX) * TILE_SIZE + w / 2,
    (latToY(coord[1], zoom) - cY) * TILE_SIZE + h / 2,
  ];
}

// --- Collision detection ---

interface Box {
  cx: number; // horizontal center
  cy: number; // vertical center (visual mid-height, not baseline)
  hw: number; // half-width (includes COLL_PAD)
  hh: number; // half-height (includes COLL_PAD)
}

// Build a box for a label placed at (px + sx, py + sy baseline).
// sy moves the baseline; the visual center is half a label-height above that.
function makeBox(px: number, py: number, text: string, sx: number, sy: number): Box {
  return {
    cx: px + sx,
    cy: py + sy - LABEL_H / 2,
    hw: (text.length * CHAR_WIDTH) / 2 + COLL_PAD,
    hh: LABEL_H / 2 + COLL_PAD,
  };
}

function collides(a: Box, b: Box): boolean {
  return Math.abs(a.cx - b.cx) < a.hw + b.hw && Math.abs(a.cy - b.cy) < a.hh + b.hh;
}

// --- Public API ---

export interface PlacedLabel {
  coord: [number, number];
  text: string;
  // StaticMaps subtracts these from the pixel position, so they are the negation
  // of the desired pixel shift (offsetX = −shiftX, offsetY = −shiftY).
  offsetX: number;
  offsetY: number;
}

/**
 * Compute StaticMaps text offsets for each labeled stop.
 *
 * All stops (labeled or not) are used for nearest-neighbor computation so that
 * transit stops influence the placement of labels on adjacent named stops.
 */
export function computeLabelOffsets(
  stops: Array<{ coord: [number, number]; label: string | null }>,
  mapW: number,
  mapH: number,
): PlacedLabel[] {
  const coords = stops.map((s) => s.coord);
  const zoom = calcZoom(coords, mapW, mapH);

  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const cX = lonToX((Math.min(...lngs) + Math.max(...lngs)) / 2, zoom);
  const cY = latToY((Math.min(...lats) + Math.max(...lats)) / 2, zoom);

  const pixels = coords.map((c) => toPx(c, cX, cY, zoom, mapW, mapH));
  const placed: Box[] = [];
  const result: PlacedLabel[] = [];

  for (let i = 0; i < stops.length; i++) {
    const { label, coord } = stops[i];
    if (!label) continue;

    const [px, py] = pixels[i];

    // Direction away from nearest other stop (labeled or not)
    let dx = 0, dy = -1; // default: straight up
    let nearDist = Infinity;
    for (let j = 0; j < stops.length; j++) {
      if (j === i) continue;
      const d = Math.hypot(pixels[j][0] - px, pixels[j][1] - py);
      if (d > 0 && d < nearDist) {
        nearDist = d;
        dx = (px - pixels[j][0]) / d;
        dy = (py - pixels[j][1]) / d;
      }
    }

    // Try placing at increasing distances in that direction
    let sx = dx * BASE_DIST;
    let sy = dy * BASE_DIST;
    for (let t = 0; t < MAX_TRIES; t++) {
      const dist = BASE_DIST + t * DIST_STEP;
      sx = dx * dist;
      sy = dy * dist;
      if (!placed.some((b) => collides(b, makeBox(px, py, label, sx, sy)))) break;
    }

    placed.push(makeBox(px, py, label, sx, sy));
    result.push({ coord, text: label, offsetX: -sx, offsetY: -sy });
  }

  return result;
}
