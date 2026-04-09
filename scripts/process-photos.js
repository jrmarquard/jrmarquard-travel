#!/usr/bin/env node
/**
 * Photo processing utility for travel photos.
 *
 * Usage: node scripts/process-photos.js <source-dir> <trip-slug>
 * Example: node scripts/process-photos.js temp-photos korea-japan-2026
 *
 * - Reads all images from <source-dir>
 * - Extracts GPS + timestamp from EXIF metadata
 * - Determines location from GPS coordinates
 * - Compresses to JPEG, max 1200px on longest side, target <1MB
 * - Names output: {n:02d}_{YYYYMMDD}_{HHmmss}_{city-country}.jpg
 * - Outputs images to:  public/photos/<trip-slug>/
 * - Outputs manifest to: src/data/photos/<trip-slug>.json
 */

import sharp from 'sharp';
import exifReader from 'exif-reader';
import { readdir, mkdir, stat, writeFile } from 'fs/promises';
import { join, extname } from 'path';

// Bounding boxes for known locations. Order matters — first match wins.
const LOCATIONS = [
  { label: 'Jeju',      country: 'Korea', slug: 'jeju-korea',       lat: [33.1, 33.8], lon: [126.0, 127.3] },
  { label: 'Busan',     country: 'Korea', slug: 'busan-korea',      lat: [35.0, 35.3], lon: [128.9, 129.2] },
  { label: 'Gyeongju', country: 'Korea', slug: 'gyeongju-korea',    lat: [35.7, 36.0], lon: [129.1, 129.4] },
  { label: 'Seoul',     country: 'Korea', slug: 'seoul-korea',      lat: [37.4, 37.7], lon: [126.7, 127.2] },
  { label: 'Fukuoka',   country: 'Japan', slug: 'fukuoka-japan',    lat: [33.5, 33.7], lon: [130.3, 130.5] },
  { label: 'Hiroshima', country: 'Japan', slug: 'hiroshima-japan',  lat: [34.3, 34.5], lon: [132.3, 132.6] },
  { label: 'Kyoto',     country: 'Japan', slug: 'kyoto-japan',      lat: [34.9, 35.1], lon: [135.6, 135.9] },
  { label: 'Osaka',     country: 'Japan', slug: 'osaka-japan',      lat: [34.4, 35.0], lon: [135.1, 135.8] },
  { label: 'Kanazawa',  country: 'Japan', slug: 'kanazawa-japan',   lat: [36.4, 36.7], lon: [136.5, 136.8] },
  { label: 'Noto',      country: 'Japan', slug: 'noto-japan',       lat: [36.7, 37.5], lon: [136.4, 137.3] },
  { label: 'Toyama',    country: 'Japan', slug: 'toyama-japan',     lat: [36.4, 37.5], lon: [136.8, 138.5] },
  { label: 'Nagano',    country: 'Japan', slug: 'nagano-japan',     lat: [36.0, 37.5], lon: [137.8, 138.6] },
  { label: 'Tokyo',     country: 'Japan', slug: 'tokyo-japan',      lat: [35.5, 35.9], lon: [139.5, 140.0] },
];

function getLocation(lat, lon) {
  for (const loc of LOCATIONS) {
    if (lat >= loc.lat[0] && lat <= loc.lat[1] && lon >= loc.lon[0] && lon <= loc.lon[1]) {
      return loc;
    }
  }
  // Fallback: crude country guess by longitude
  if (lon >= 124 && lon <= 132) return { label: 'Korea', country: 'Korea', slug: 'korea' };
  if (lon > 129 && lon <= 146)  return { label: 'Japan',  country: 'Japan',  slug: 'japan'  };
  return { label: 'Unknown', country: 'Unknown', slug: 'unknown' };
}

function gpsToDecimal(dms, ref) {
  const d = dms[0] + dms[1] / 60 + dms[2] / 3600;
  return ref === 'S' || ref === 'W' ? -d : d;
}

async function extractMeta(filePath) {
  const meta = await sharp(filePath).metadata();
  let date = null;
  let lat = null;
  let lon = null;

  if (meta.exif) {
    const exif = exifReader(meta.exif);
    date = exif.Photo?.DateTimeOriginal ?? exif.Image?.DateTime ?? null;
    const gps = exif.GPSInfo;
    if (gps?.GPSLatitude) {
      lat = gpsToDecimal(gps.GPSLatitude, gps.GPSLatitudeRef);
      lon = gpsToDecimal(gps.GPSLongitude, gps.GPSLongitudeRef);
    }
  }

  return { date, lat, lon };
}

const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);
const MAX_PX   = 1200;
const MAX_BYTES = 900 * 1024; // target 900KB to give buffer under 1MB

async function compress(filePath) {
  let quality = 82;
  let buffer;
  do {
    buffer = await sharp(filePath)
      .rotate()
      .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    quality -= 5;
  } while (buffer.length > MAX_BYTES && quality > 20);
  return buffer;
}

async function main() {
  const [, , sourceDir, tripSlug] = process.argv;

  if (!sourceDir || !tripSlug) {
    console.error('Usage: node scripts/process-photos.js <source-dir> <trip-slug>');
    process.exit(1);
  }

  const outputDir  = join('public', 'photos', tripSlug);
  const manifestDir = join('src', 'data', 'photos');

  await mkdir(outputDir, { recursive: true });
  await mkdir(manifestDir, { recursive: true });

  const files = (await readdir(sourceDir))
    .filter(f => IMG_EXTS.has(extname(f).toLowerCase()))
    .sort();

  console.log(`\nFound ${files.length} image(s) in "${sourceDir}"\n`);

  const photos = await Promise.all(
    files.map(async (file) => ({
      file,
      filePath: join(sourceDir, file),
      ...(await extractMeta(join(sourceDir, file))),
    }))
  );

  // Sort by timestamp (EXIF date, stored as local time but parsed as UTC by exif-reader)
  photos.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date - b.date;
  });

  const manifest = [];

  for (let i = 0; i < photos.length; i++) {
    const { file, filePath, date, lat, lon } = photos[i];
    const location = lat != null ? getLocation(lat, lon) : { label: 'Unknown', country: 'Unknown', slug: 'unknown' };

    // exif-reader returns DateTimeOriginal as a Date where the numeric values
    // represent the local time (stored as if UTC in EXIF). Use getUTC* to read them.
    let dateStr = 'unknown', timeStr = 'unknown', isoDate = null, displayTime = null;
    if (date) {
      const Y  = date.getUTCFullYear();
      const Mo = String(date.getUTCMonth() + 1).padStart(2, '0');
      const D  = String(date.getUTCDate()).padStart(2, '0');
      const H  = String(date.getUTCHours()).padStart(2, '0');
      const Mi = String(date.getUTCMinutes()).padStart(2, '0');
      const S  = String(date.getUTCSeconds()).padStart(2, '0');
      dateStr     = `${Y}${Mo}${D}`;
      timeStr     = `${H}${Mi}${S}`;
      isoDate     = `${Y}-${Mo}-${D}`;
      displayTime = `${H}:${Mi}`;
    }

    const n = String(i + 1).padStart(2, '0');
    const outputFilename = `${n}_${dateStr}_${timeStr}_${location.slug}.jpg`;
    const outputPath = join(outputDir, outputFilename);

    const buffer   = await compress(filePath);
    const origSize = (await stat(filePath)).size;
    await writeFile(outputPath, buffer);

    console.log(`  [${n}] ${file}`);
    console.log(`      → ${outputFilename}`);
    console.log(`      ${location.label}, ${location.country}  |  ${isoDate} ${displayTime}  |  ${Math.round(origSize / 1024)}KB → ${Math.round(buffer.length / 1024)}KB`);
    console.log();

    manifest.push({
      filename: outputFilename,
      date: isoDate,
      time: displayTime,
      location: location.label,
      country: location.country,
      lat: lat != null ? Math.round(lat * 10000) / 10000 : null,
      lon: lon != null ? Math.round(lon * 10000) / 10000 : null,
    });
  }

  const manifestPath = join(manifestDir, `${tripSlug}.json`);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`Manifest → ${manifestPath}`);
  console.log(`Photos   → ${outputDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
