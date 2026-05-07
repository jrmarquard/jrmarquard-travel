import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { TRIPS_DIR } from '../../../lib/paths';

export async function GET() {
  const files = await fs.readdir(TRIPS_DIR);
  const trips = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map(async (file) => {
        const content = await fs.readFile(path.join(TRIPS_DIR, file), 'utf-8');
        const data = JSON.parse(content);
        return { id: data.id, title: data.title, dates: data.dates, countries: data.countries };
      }),
  );
  return NextResponse.json(trips);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { id, title, start, end, countries } = body as {
    id: string;
    title: string;
    start: string;
    end: string;
    countries: string[];
  };

  if (!/^[a-z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: 'id must match ^[a-z0-9-]+$' }, { status: 400 });
  }

  const jsonPath = path.join(TRIPS_DIR, `${id}.json`);
  try {
    await fs.access(jsonPath);
    return NextResponse.json({ error: 'Trip already exists' }, { status: 409 });
  } catch {}

  const tripData = {
    $schema: '2.0',
    id,
    title,
    dates: { start, end },
    countries,
    days: [],
    segments: [],
    photos: [],
  };

  await fs.writeFile(jsonPath, JSON.stringify(tripData, null, 2) + '\n');

  const tsPath = path.join(TRIPS_DIR, `${id}.ts`);
  await fs.writeFile(
    tsPath,
    `import { TripSchema } from '../../schema/validate';\nimport type { Trip } from '../../schema/types';\nimport raw from './${id}.json';\n\nexport const trip: Trip = TripSchema.parse(raw);\n`,
  );

  return NextResponse.json(tripData, { status: 201 });
}
