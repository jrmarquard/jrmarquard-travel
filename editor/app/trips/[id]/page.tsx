'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ── Types (mirror schema/types.ts) ────────────────────────────────────────────

interface LocationData {
  name: string;
  region?: string;
  country: string;
  countryName: string;
  coordinates?: { lat: number; lng: number };
}

interface StopData {
  id: string;
  location: LocationData;
  arrival?: string;
  departure?: string;
  timezone?: string;
  title?: string;
  notes?: string;
}

interface DayData {
  date: string;
  title?: string;
  primaryStopId: string;
  stops: StopData[];
  notes?: string;
}

interface FlightLeg {
  flightNumber: string;
  aircraft?: string;
  durationMinutes?: number;
  departure: { iataCode?: string; location: LocationData; datetime: string; timezone: string; terminal?: string; gate?: string };
  arrival: { iataCode?: string; location: LocationData; datetime: string; timezone: string; terminal?: string };
}

interface FlightSegment {
  id: string; type: 'flight'; status?: string; bookingRef?: string; provider?: string; notes?: string;
  airline: string; cabin?: string; legs: FlightLeg[];
}
interface AccommodationSegment {
  id: string; type: 'accommodation'; status?: string; bookingRef?: string; provider?: string; notes?: string;
  name: string; location: LocationData; checkIn: string; checkOut: string; roomType?: string; guests?: number;
}
interface ActivitySegment {
  id: string; type: 'activity'; status?: string; bookingRef?: string; provider?: string; notes?: string;
  name: string; location: LocationData; schedule: { dates: string[] } | { start: string; end: string }; category?: string;
}
interface NoteSegment {
  id: string; type: 'note'; status?: string;
  title: string; date: string; body: string; location?: LocationData;
}

type SegmentData = FlightSegment | AccommodationSegment | ActivitySegment | NoteSegment;

interface PhotoData {
  id: string; filename: string; date: string; stopId?: string;
  takenAt?: string; caption?: string; alt?: string;
  source: { sha256: string; sizeBytes: number; originalFilename: string; exif: { datetimeOriginal: string; gps?: { lat: number; lng: number } } };
}

interface TripData {
  $schema: '2.0'; id: string; title: string; description?: string; coverPhotoId?: string;
  dates: { start: string; end: string };
  countries: string[]; tags?: string[];
  days: DayData[]; segments: SegmentData[]; photos: PhotoData[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';
const btnCls = 'text-xs border border-slate-300 rounded px-2.5 py-1 hover:bg-slate-100 transition-colors';
const dangerBtnCls = 'text-xs text-red-600 border border-red-200 rounded px-2.5 py-1 hover:bg-red-50 transition-colors';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{title}</h2>
      {action}
    </div>
  );
}

function emptyLocation(): LocationData {
  return { name: '', country: '', countryName: '' };
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Location form ─────────────────────────────────────────────────────────────

function LocationForm({ loc, onChange }: { loc: LocationData; onChange: (l: LocationData) => void }) {
  function set(k: keyof LocationData, v: string) {
    onChange({ ...loc, [k]: v || undefined });
  }
  function setCoord(k: 'lat' | 'lng', v: string) {
    const n = parseFloat(v);
    if (isNaN(n)) {
      const c = { ...loc.coordinates };
      delete c[k];
      onChange({ ...loc, coordinates: Object.keys(c).length ? c as { lat: number; lng: number } : undefined });
    } else {
      onChange({ ...loc, coordinates: { lat: loc.coordinates?.lat ?? 0, lng: loc.coordinates?.lng ?? 0, [k]: n } });
    }
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Name"><input value={loc.name} onChange={(e) => onChange({ ...loc, name: e.target.value })} className={inputCls} placeholder="Osaka" /></Field>
      <Field label="Region"><input value={loc.region ?? ''} onChange={(e) => set('region', e.target.value)} className={inputCls} placeholder="Kansai" /></Field>
      <Field label="Country code"><input value={loc.country} onChange={(e) => onChange({ ...loc, country: e.target.value.toUpperCase() })} className={inputCls} placeholder="JP" maxLength={2} /></Field>
      <Field label="Country name"><input value={loc.countryName} onChange={(e) => onChange({ ...loc, countryName: e.target.value })} className={inputCls} placeholder="Japan" /></Field>
      <Field label="Latitude"><input type="number" step="any" value={loc.coordinates?.lat ?? ''} onChange={(e) => setCoord('lat', e.target.value)} className={inputCls} placeholder="34.6937" /></Field>
      <Field label="Longitude"><input type="number" step="any" value={loc.coordinates?.lng ?? ''} onChange={(e) => setCoord('lng', e.target.value)} className={inputCls} placeholder="135.5023" /></Field>
    </div>
  );
}

// ── Stop editor ───────────────────────────────────────────────────────────────

function StopEditor({ stop, onChange, onRemove }: { stop: StopData; onChange: (s: StopData) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 cursor-pointer" onClick={() => setOpen(!open)}>
        <span className="text-sm font-medium">{stop.location.name || stop.id} <span className="text-slate-400 text-xs font-normal">· {stop.id}</span></span>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button className={dangerBtnCls} onClick={onRemove}>Remove</button>
          <button className={btnCls} onClick={() => setOpen(!open)}>{open ? '▲' : '▼'}</button>
        </div>
      </div>
      {open && (
        <div className="p-4 space-y-4 border-t border-slate-200">
          <Field label="Stop ID" hint="Used by photos and primaryStopId — change with care">
            <input value={stop.id} onChange={(e) => onChange({ ...stop, id: e.target.value })} className={inputCls} />
          </Field>
          <LocationForm loc={stop.location} onChange={(l) => onChange({ ...stop, location: l })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Timezone"><input value={stop.timezone ?? ''} onChange={(e) => onChange({ ...stop, timezone: e.target.value || undefined })} className={inputCls} placeholder="Asia/Tokyo" /></Field>
            <Field label="Arrival"><input type="datetime-local" value={stop.arrival?.slice(0, 16) ?? ''} onChange={(e) => onChange({ ...stop, arrival: e.target.value ? e.target.value + ':00+00:00' : undefined })} className={inputCls} /></Field>
            <Field label="Departure"><input type="datetime-local" value={stop.departure?.slice(0, 16) ?? ''} onChange={(e) => onChange({ ...stop, departure: e.target.value ? e.target.value + ':00+00:00' : undefined })} className={inputCls} /></Field>
          </div>
          <Field label="Notes"><textarea value={stop.notes ?? ''} onChange={(e) => onChange({ ...stop, notes: e.target.value || undefined })} className={inputCls} rows={2} /></Field>
        </div>
      )}
    </div>
  );
}

// ── Day editor ────────────────────────────────────────────────────────────────

function DayEditor({ day, onChange, onRemove }: { day: DayData; onChange: (d: DayData) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);

  function addStop() {
    const id = `stop-${uid()}`;
    onChange({ ...day, stops: [...day.stops, { id, location: emptyLocation() }] });
  }

  function updateStop(i: number, s: StopData) {
    const stops = day.stops.map((x, idx) => (idx === i ? s : x));
    onChange({ ...day, stops });
  }

  function removeStop(i: number) {
    const stops = day.stops.filter((_, idx) => idx !== i);
    const primaryStopId = day.primaryStopId === day.stops[i].id ? (stops[0]?.id ?? '') : day.primaryStopId;
    onChange({ ...day, stops, primaryStopId });
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white cursor-pointer" onClick={() => setOpen(!open)}>
        <div>
          <span className="font-medium text-sm">{day.date}</span>
          {day.title && <span className="text-slate-500 text-sm ml-2">· {day.title}</span>}
          <span className="text-slate-400 text-xs ml-2">{day.stops.length} stop{day.stops.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button className={dangerBtnCls} onClick={onRemove}>Remove</button>
          <button className={btnCls} onClick={() => setOpen(!open)}>{open ? '▲' : '▼'}</button>
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-5 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date"><input type="date" value={day.date} onChange={(e) => onChange({ ...day, date: e.target.value })} className={inputCls} /></Field>
            <Field label="Title"><input value={day.title ?? ''} onChange={(e) => onChange({ ...day, title: e.target.value || undefined })} className={inputCls} placeholder="Day title" /></Field>
          </div>

          <Field label="Notes"><textarea value={day.notes ?? ''} onChange={(e) => onChange({ ...day, notes: e.target.value || undefined })} className={inputCls} rows={2} /></Field>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stops</span>
              <button className={btnCls} onClick={addStop}>+ Add stop</button>
            </div>
            <div className="space-y-2">
              {day.stops.map((stop, i) => (
                <StopEditor key={stop.id} stop={stop} onChange={(s) => updateStop(i, s)} onRemove={() => removeStop(i)} />
              ))}
              {day.stops.length === 0 && <p className="text-sm text-slate-400">No stops — add one above.</p>}
            </div>
          </div>

          {day.stops.length > 0 && (
            <Field label="Primary stop">
              <select value={day.primaryStopId} onChange={(e) => onChange({ ...day, primaryStopId: e.target.value })} className={inputCls}>
                {day.stops.map((s) => (
                  <option key={s.id} value={s.id}>{s.location.name || s.id}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

// ── Segment editors ───────────────────────────────────────────────────────────

function BaseSegmentFields({ seg, onChange }: { seg: SegmentData; onChange: (s: SegmentData) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <Field label="Status">
        <select value={seg.status ?? ''} onChange={(e) => onChange({ ...seg, status: e.target.value || undefined } as SegmentData)} className={inputCls}>
          <option value="">—</option>
          {['planned', 'confirmed', 'completed', 'cancelled', 'modified'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Booking ref">
        <input value={(seg as FlightSegment).bookingRef ?? ''} onChange={(e) => onChange({ ...seg, bookingRef: e.target.value || undefined } as SegmentData)} className={inputCls} placeholder="ABC123" />
      </Field>
      <Field label="Provider">
        <input value={(seg as FlightSegment).provider ?? ''} onChange={(e) => onChange({ ...seg, provider: e.target.value || undefined } as SegmentData)} className={inputCls} placeholder="Qantas" />
      </Field>
      <Field label="Notes">
        <input value={(seg as FlightSegment).notes ?? ''} onChange={(e) => onChange({ ...seg, notes: e.target.value || undefined } as SegmentData)} className={inputCls} />
      </Field>
    </div>
  );
}

function FlightSegmentForm({ seg, onChange }: { seg: FlightSegment; onChange: (s: FlightSegment) => void }) {
  function updateLeg(i: number, leg: FlightLeg) {
    onChange({ ...seg, legs: seg.legs.map((l, idx) => (idx === i ? leg : l)) });
  }
  function addLeg() {
    const leg: FlightLeg = {
      flightNumber: '',
      departure: { location: emptyLocation(), datetime: '', timezone: '' },
      arrival: { location: emptyLocation(), datetime: '', timezone: '' },
    };
    onChange({ ...seg, legs: [...seg.legs, leg] });
  }
  function removeLeg(i: number) {
    onChange({ ...seg, legs: seg.legs.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="space-y-4">
      <BaseSegmentFields seg={seg} onChange={onChange as (s: SegmentData) => void} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Airline"><input value={seg.airline} onChange={(e) => onChange({ ...seg, airline: e.target.value })} className={inputCls} placeholder="Qantas" /></Field>
        <Field label="Cabin">
          <select value={seg.cabin ?? ''} onChange={(e) => onChange({ ...seg, cabin: e.target.value || undefined })} className={inputCls}>
            <option value="">—</option>
            <option>economy</option><option>premium_economy</option><option>business</option><option>first</option>
          </select>
        </Field>
      </div>
      {seg.legs.map((leg, i) => (
        <div key={i} className="border border-slate-200 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Leg {i + 1}</span>
            {seg.legs.length > 1 && <button className={dangerBtnCls} onClick={() => removeLeg(i)}>Remove leg</button>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Flight number"><input value={leg.flightNumber} onChange={(e) => updateLeg(i, { ...leg, flightNumber: e.target.value })} className={inputCls} placeholder="QF1" /></Field>
            <Field label="Aircraft"><input value={leg.aircraft ?? ''} onChange={(e) => updateLeg(i, { ...leg, aircraft: e.target.value || undefined })} className={inputCls} placeholder="A380" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Departure</p>
              <Field label="IATA"><input value={leg.departure.iataCode ?? ''} onChange={(e) => updateLeg(i, { ...leg, departure: { ...leg.departure, iataCode: e.target.value || undefined } })} className={inputCls} placeholder="SYD" maxLength={3} /></Field>
              <Field label="City"><input value={leg.departure.location.name} onChange={(e) => updateLeg(i, { ...leg, departure: { ...leg.departure, location: { ...leg.departure.location, name: e.target.value } } })} className={inputCls} placeholder="Sydney" /></Field>
              <Field label="Date/time"><input type="datetime-local" value={leg.departure.datetime?.slice(0, 16) ?? ''} onChange={(e) => updateLeg(i, { ...leg, departure: { ...leg.departure, datetime: e.target.value + ':00+00:00' } })} className={inputCls} /></Field>
              <Field label="Timezone"><input value={leg.departure.timezone} onChange={(e) => updateLeg(i, { ...leg, departure: { ...leg.departure, timezone: e.target.value } })} className={inputCls} placeholder="Australia/Sydney" /></Field>
              <Field label="Terminal"><input value={leg.departure.terminal ?? ''} onChange={(e) => updateLeg(i, { ...leg, departure: { ...leg.departure, terminal: e.target.value || undefined } })} className={inputCls} placeholder="T1" /></Field>
              <Field label="Gate"><input value={leg.departure.gate ?? ''} onChange={(e) => updateLeg(i, { ...leg, departure: { ...leg.departure, gate: e.target.value || undefined } })} className={inputCls} placeholder="G12" /></Field>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Arrival</p>
              <Field label="IATA"><input value={leg.arrival.iataCode ?? ''} onChange={(e) => updateLeg(i, { ...leg, arrival: { ...leg.arrival, iataCode: e.target.value || undefined } })} className={inputCls} placeholder="LHR" maxLength={3} /></Field>
              <Field label="City"><input value={leg.arrival.location.name} onChange={(e) => updateLeg(i, { ...leg, arrival: { ...leg.arrival, location: { ...leg.arrival.location, name: e.target.value } } })} className={inputCls} placeholder="London" /></Field>
              <Field label="Date/time"><input type="datetime-local" value={leg.arrival.datetime?.slice(0, 16) ?? ''} onChange={(e) => updateLeg(i, { ...leg, arrival: { ...leg.arrival, datetime: e.target.value + ':00+00:00' } })} className={inputCls} /></Field>
              <Field label="Timezone"><input value={leg.arrival.timezone} onChange={(e) => updateLeg(i, { ...leg, arrival: { ...leg.arrival, timezone: e.target.value } })} className={inputCls} placeholder="Europe/London" /></Field>
              <Field label="Terminal"><input value={leg.arrival.terminal ?? ''} onChange={(e) => updateLeg(i, { ...leg, arrival: { ...leg.arrival, terminal: e.target.value || undefined } })} className={inputCls} placeholder="T5" /></Field>
            </div>
          </div>
        </div>
      ))}
      <button className={btnCls} onClick={addLeg}>+ Add leg</button>
    </div>
  );
}

function AccommodationForm({ seg, onChange }: { seg: AccommodationSegment; onChange: (s: AccommodationSegment) => void }) {
  return (
    <div className="space-y-4">
      <BaseSegmentFields seg={seg} onChange={onChange as (s: SegmentData) => void} />
      <Field label="Name"><input value={seg.name} onChange={(e) => onChange({ ...seg, name: e.target.value })} className={inputCls} placeholder="Hotel name" /></Field>
      <LocationForm loc={seg.location} onChange={(l) => onChange({ ...seg, location: l })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Check-in"><input type="date" value={seg.checkIn} onChange={(e) => onChange({ ...seg, checkIn: e.target.value })} className={inputCls} /></Field>
        <Field label="Check-out"><input type="date" value={seg.checkOut} onChange={(e) => onChange({ ...seg, checkOut: e.target.value })} className={inputCls} /></Field>
        <Field label="Room type"><input value={seg.roomType ?? ''} onChange={(e) => onChange({ ...seg, roomType: e.target.value || undefined })} className={inputCls} placeholder="Deluxe king" /></Field>
        <Field label="Guests"><input type="number" min={1} value={seg.guests ?? ''} onChange={(e) => onChange({ ...seg, guests: parseInt(e.target.value) || undefined })} className={inputCls} /></Field>
      </div>
    </div>
  );
}

function ActivityForm({ seg, onChange }: { seg: ActivitySegment; onChange: (s: ActivitySegment) => void }) {
  const isDates = 'dates' in seg.schedule;
  return (
    <div className="space-y-4">
      <BaseSegmentFields seg={seg} onChange={onChange as (s: SegmentData) => void} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><input value={seg.name} onChange={(e) => onChange({ ...seg, name: e.target.value })} className={inputCls} /></Field>
        <Field label="Category"><input value={seg.category ?? ''} onChange={(e) => onChange({ ...seg, category: e.target.value || undefined })} className={inputCls} placeholder="sightseeing" /></Field>
      </div>
      <LocationForm loc={seg.location} onChange={(l) => onChange({ ...seg, location: l })} />
      <div>
        <div className="flex gap-3 mb-3">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="radio" checked={isDates} onChange={() => onChange({ ...seg, schedule: { dates: [] } })} /> Specific dates
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="radio" checked={!isDates} onChange={() => onChange({ ...seg, schedule: { start: '', end: '' } })} /> Date range
          </label>
        </div>
        {isDates ? (
          <Field label="Dates (comma-separated YYYY-MM-DD)">
            <input
              value={(seg.schedule as { dates: string[] }).dates.join(', ')}
              onChange={(e) => onChange({ ...seg, schedule: { dates: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })}
              className={inputCls} placeholder="2027-04-01, 2027-04-02"
            />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start"><input type="date" value={(seg.schedule as { start: string; end: string }).start} onChange={(e) => onChange({ ...seg, schedule: { ...(seg.schedule as { start: string; end: string }), start: e.target.value } })} className={inputCls} /></Field>
            <Field label="End"><input type="date" value={(seg.schedule as { start: string; end: string }).end} onChange={(e) => onChange({ ...seg, schedule: { ...(seg.schedule as { start: string; end: string }), end: e.target.value } })} className={inputCls} /></Field>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteForm({ seg, onChange }: { seg: NoteSegment; onChange: (s: NoteSegment) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title"><input value={seg.title} onChange={(e) => onChange({ ...seg, title: e.target.value })} className={inputCls} /></Field>
        <Field label="Date"><input type="date" value={seg.date} onChange={(e) => onChange({ ...seg, date: e.target.value })} className={inputCls} /></Field>
      </div>
      <Field label="Body"><textarea value={seg.body} onChange={(e) => onChange({ ...seg, body: e.target.value })} className={inputCls} rows={4} /></Field>
    </div>
  );
}

function SegmentEditor({ seg, onChange, onRemove }: { seg: SegmentData; onChange: (s: SegmentData) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const label = seg.type === 'flight'
    ? `✈ ${(seg as FlightSegment).airline} — ${(seg as FlightSegment).legs[0]?.departure.iataCode ?? '?'} → ${(seg as FlightSegment).legs[0]?.arrival.iataCode ?? '?'}`
    : seg.type === 'accommodation'
    ? `🏨 ${(seg as AccommodationSegment).name}`
    : seg.type === 'activity'
    ? `🎯 ${(seg as ActivitySegment).name}`
    : `📝 ${(seg as NoteSegment).title}`;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white cursor-pointer" onClick={() => setOpen(!open)}>
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">{seg.status ?? 'no status'}</span>
          <button className={dangerBtnCls} onClick={onRemove}>Remove</button>
          <button className={btnCls} onClick={() => setOpen(!open)}>{open ? '▲' : '▼'}</button>
        </div>
      </div>
      {open && (
        <div className="p-4 border-t border-slate-200">
          {seg.type === 'flight' && <FlightSegmentForm seg={seg as FlightSegment} onChange={onChange as (s: FlightSegment) => void} />}
          {seg.type === 'accommodation' && <AccommodationForm seg={seg as AccommodationSegment} onChange={onChange as (s: AccommodationSegment) => void} />}
          {seg.type === 'activity' && <ActivityForm seg={seg as ActivitySegment} onChange={onChange as (s: ActivitySegment) => void} />}
          {seg.type === 'note' && <NoteForm seg={seg as NoteSegment} onChange={onChange as (s: NoteSegment) => void} />}
        </div>
      )}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'itinerary' | 'segments' | 'photos';

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TripEditorPage({ params }: { params: { id: string } }) {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/trips/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject('Not found')))
      .then((data) => setTrip(data))
      .catch((e) => setError(String(e)));
  }, [params.id]);

  const update = useCallback((updater: (prev: TripData) => TripData) => {
    setTrip((prev) => (prev ? updater(prev) : prev));
    setDirty(true);
    setError(null);
  }, []);

  async function save() {
    if (!trip) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trip),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = data.issues ? data.issues.map((i: { message: string }) => i.message).join('; ') : data.error;
        setError(msg);
        return;
      }
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  if (!trip && !error) return <div className="p-12 text-slate-400 text-sm">Loading…</div>;
  if (error && !trip) return <div className="p-12 text-red-600 text-sm">{error}</div>;
  if (!trip) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'itinerary', label: `Itinerary (${trip.days.length})` },
    { id: 'segments', label: `Segments (${trip.segments.length})` },
    { id: 'photos', label: `Photos (${trip.photos.length})` },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← Trips</Link>
          <h1 className="font-semibold">{trip.title}</h1>
          {dirty && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-600 max-w-xs truncate">{error}</span>}
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-6">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <SectionHeader title="Trip info" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Title">
                <input value={trip.title} onChange={(e) => update((t) => ({ ...t, title: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="ID" hint="Read-only — rename the file to change">
                <input value={trip.id} readOnly className={`${inputCls} bg-slate-50 cursor-not-allowed`} />
              </Field>
              <Field label="Start date">
                <input type="date" value={trip.dates.start} onChange={(e) => update((t) => ({ ...t, dates: { ...t.dates, start: e.target.value } }))} className={inputCls} />
              </Field>
              <Field label="End date">
                <input type="date" value={trip.dates.end} onChange={(e) => update((t) => ({ ...t, dates: { ...t.dates, end: e.target.value } }))} className={inputCls} />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={trip.description ?? ''} onChange={(e) => update((t) => ({ ...t, description: e.target.value || undefined }))} className={inputCls} rows={3} />
            </Field>
            <TagField
              label="Countries"
              hint="ISO 2-letter codes"
              tags={trip.countries}
              onChange={(v) => update((t) => ({ ...t, countries: v }))}
              transform={(s) => s.toUpperCase()}
            />
            <TagField
              label="Tags"
              tags={trip.tags ?? []}
              onChange={(v) => update((t) => ({ ...t, tags: v.length ? v : undefined }))}
            />
          </div>
        )}

        {/* ── Itinerary ── */}
        {tab === 'itinerary' && (
          <div className="space-y-3">
            <SectionHeader
              title="Days"
              action={
                <button
                  className={btnCls}
                  onClick={() => {
                    const stopId = `stop-${uid()}`;
                    update((t) => ({
                      ...t,
                      days: [
                        ...t.days,
                        { date: '', primaryStopId: stopId, stops: [{ id: stopId, location: emptyLocation() }] },
                      ],
                    }));
                  }}
                >
                  + Add day
                </button>
              }
            />
            {trip.days.length === 0 && <p className="text-sm text-slate-400">No days yet.</p>}
            {trip.days.map((day, i) => (
              <DayEditor
                key={i}
                day={day}
                onChange={(d) => update((t) => ({ ...t, days: t.days.map((x, idx) => (idx === i ? d : x)) }))}
                onRemove={() => update((t) => ({ ...t, days: t.days.filter((_, idx) => idx !== i) }))}
              />
            ))}
          </div>
        )}

        {/* ── Segments ── */}
        {tab === 'segments' && (
          <div className="space-y-3">
            <SectionHeader
              title="Segments"
              action={
                <div className="flex gap-2">
                  {[
                    { label: '✈ Flight', make: (): FlightSegment => ({ id: uid(), type: 'flight', airline: '', legs: [{ flightNumber: '', departure: { location: emptyLocation(), datetime: '', timezone: '' }, arrival: { location: emptyLocation(), datetime: '', timezone: '' } }] }) },
                    { label: '🏨 Stay', make: (): AccommodationSegment => ({ id: uid(), type: 'accommodation', name: '', location: emptyLocation(), checkIn: '', checkOut: '' }) },
                    { label: '🎯 Activity', make: (): ActivitySegment => ({ id: uid(), type: 'activity', name: '', location: emptyLocation(), schedule: { dates: [] } }) },
                    { label: '📝 Note', make: (): NoteSegment => ({ id: uid(), type: 'note', title: '', date: '', body: '' }) },
                  ].map(({ label, make }) => (
                    <button key={label} className={btnCls} onClick={() => update((t) => ({ ...t, segments: [...t.segments, make()] }))}>
                      + {label}
                    </button>
                  ))}
                </div>
              }
            />
            {trip.segments.length === 0 && <p className="text-sm text-slate-400">No segments yet.</p>}
            {trip.segments.map((seg, i) => (
              <SegmentEditor
                key={seg.id}
                seg={seg}
                onChange={(s) => update((t) => ({ ...t, segments: t.segments.map((x, idx) => (idx === i ? s : x)) }))}
                onRemove={() => update((t) => ({ ...t, segments: t.segments.filter((_, idx) => idx !== i) }))}
              />
            ))}
          </div>
        )}

        {/* ── Photos ── */}
        {tab === 'photos' && (
          <div className="space-y-3">
            <SectionHeader title="Photos" />
            {trip.photos.length === 0 && <p className="text-sm text-slate-400">No photos. Run the process-photos script from the site directory to add them.</p>}
            {trip.photos.map((photo, i) => (
              <div key={photo.id} className="border border-slate-200 rounded-lg p-4 grid grid-cols-[1fr_2fr] gap-4 items-start">
                <div>
                  <p className="text-xs font-medium text-slate-700 truncate">{photo.filename}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{photo.date} · {(photo.source.sizeBytes / 1024).toFixed(0)} KB</p>
                  {photo.takenAt && <p className="text-xs text-slate-400">{photo.takenAt}</p>}
                </div>
                <div className="space-y-3">
                  <Field label="Alt text">
                    <input value={photo.alt ?? ''} onChange={(e) => update((t) => ({ ...t, photos: t.photos.map((p, idx) => idx === i ? { ...p, alt: e.target.value || undefined } : p) }))} className={inputCls} placeholder="Describe the photo" />
                  </Field>
                  <Field label="Caption">
                    <input value={photo.caption ?? ''} onChange={(e) => update((t) => ({ ...t, photos: t.photos.map((p, idx) => idx === i ? { ...p, caption: e.target.value || undefined } : p) }))} className={inputCls} placeholder="Optional caption" />
                  </Field>
                  <Field label="Stop">
                    <select value={photo.stopId ?? ''} onChange={(e) => update((t) => ({ ...t, photos: t.photos.map((p, idx) => idx === i ? { ...p, stopId: e.target.value || undefined } : p) }))} className={inputCls}>
                      <option value="">—</option>
                      {trip.days.flatMap((d) => d.stops).map((s) => (
                        <option key={s.id} value={s.id}>{s.location.name || s.id}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tag field ─────────────────────────────────────────────────────────────────

function TagField({ label, hint, tags, onChange, transform }: {
  label: string; hint?: string; tags: string[];
  onChange: (tags: string[]) => void; transform?: (s: string) => string;
}) {
  const [input, setInput] = useState('');
  function add() {
    const val = transform ? transform(input.trim()) : input.trim();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput('');
  }
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 text-xs bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
            {t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))} className="text-slate-400 hover:text-red-500 leading-none">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} className={`${inputCls} flex-1`} placeholder="Add and press Enter" />
        <button onClick={add} className={btnCls}>Add</button>
      </div>
    </Field>
  );
}
