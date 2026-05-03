import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { TRIPS_DIR } from '../../../../lib/paths';
import { TripSchema } from '@site/schema/validate';

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const filePath = path.join(TRIPS_DIR, `${params.id}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const body = await request.json();

  if (body.id !== params.id) {
    return NextResponse.json({ error: 'id mismatch' }, { status: 400 });
  }

  const result = TripSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', issues: result.error.issues }, { status: 422 });
  }

  const filePath = path.join(TRIPS_DIR, `${params.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(body, null, 2) + '\n');

  return NextResponse.json({ ok: true });
}
