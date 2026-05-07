#!/usr/bin/env tsx

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateTripMap, type Trip } from './map-core.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
const [inputArg, outputArg] = args;
const includeHome = flags.includes('--include-home');

if (!inputArg) {
  console.error('Usage: tsx generate-map.ts <trip.json> [output.png] [--include-home]');
  process.exit(1);
}

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg ?? 'map.png');

const trip: Trip = JSON.parse(readFileSync(inputPath, 'utf-8'));

console.log(`Generating map for "${trip.title}"…`);
const ok = await generateTripMap(trip, outputPath, { includeHome });
if (!ok) process.exit(1);
console.log(`Map saved to: ${outputPath}`);
