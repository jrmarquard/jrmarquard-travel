import Link from 'next/link';
import { TRIPS_DIR } from '../lib/paths';
import fs from 'fs/promises';
import path from 'path';

async function getTrips() {
  const files = await fs.readdir(TRIPS_DIR);
  return Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map(async (file) => {
        const content = await fs.readFile(path.join(TRIPS_DIR, file), 'utf-8');
        const d = JSON.parse(content);
        return {
          id: d.id as string,
          title: d.title as string,
          dates: d.dates as { start: string; end: string },
          countries: d.countries as string[],
        };
      }),
  );
}

export default async function HomePage() {
  const trips = await getTrips();

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Trips</h1>
        <Link
          href="/trips/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <p className="text-slate-500 text-sm">No trips yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden bg-white">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link href={`/trips/${trip.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group">
                <div>
                  <p className="font-medium group-hover:text-blue-600 transition-colors">{trip.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {trip.dates.start} → {trip.dates.end} · {trip.countries.join(', ')}
                  </p>
                </div>
                <span className="text-slate-400 text-sm">Edit →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
