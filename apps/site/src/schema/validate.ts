import { z } from 'zod';

// ── Primitives ────────────────────────────────────────────────────────────────

const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be an ISO date (YYYY-MM-DD)');
const ISODatetimeSchema = z.string().datetime({ offset: true });
const IANATimezoneSchema = z.string();
const CountryCodeSchema = z.string();

// ── Location ──────────────────────────────────────────────────────────────────

const GeoCoordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const LocationSchema = z.object({
  name: z.string(),
  region: z.string().optional(),
  country: CountryCodeSchema,
  countryName: z.string(),
  coordinates: GeoCoordinatesSchema.optional(),
});

const TransitLocationSchema = z.object({
  kind: z.enum(['in-air', 'at-sea', 'overland']),
  description: z.string().optional(),
  waypoints: z.tuple([LocationSchema, LocationSchema]).rest(LocationSchema),
});

const AnyLocationSchema = z.union([LocationSchema, TransitLocationSchema]);

// ── Photos ────────────────────────────────────────────────────────────────────

const PhotoSourceSchema = z.object({
  sha256: z.string().length(64, 'sha256 must be exactly 64 characters'),
  sizeBytes: z.number(),
  originalFilename: z.string(),
  exif: z.object({
    datetimeOriginal: z.string(),
    gps: GeoCoordinatesSchema.optional(),
    cameraMake: z.string().optional(),
    cameraModel: z.string().optional(),
    focalLength: z.string().optional(),
  }),
});

const PhotoSchema = z.object({
  id: z.string(),
  filename: z.string(),
  date: ISODateSchema,
  stopId: z.string().optional(),
  takenAt: ISODatetimeSchema.optional(),
  caption: z.string().optional(),
  alt: z.string().optional(),
  source: PhotoSourceSchema,
});

// ── Stops ─────────────────────────────────────────────────────────────────────

const StopSchema = z.object({
  id: z.string(),
  home: z.literal(true).optional(),
  location: AnyLocationSchema,
  arrival: ISODatetimeSchema.optional(),
  departure: ISODatetimeSchema.optional(),
  timezone: IANATimezoneSchema.optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
});

// ── Days ──────────────────────────────────────────────────────────────────────

const DaySchema = z
  .object({
    date: ISODateSchema,
    title: z.string().optional(),
    primaryStopId: z.string(),
    stops: z.array(StopSchema),
    notes: z.string().optional(),
  })
  .refine((day) => day.stops.some((stop) => stop.id === day.primaryStopId), {
    message: 'primaryStopId must reference an id that exists in the stops array',
    path: ['primaryStopId'],
  });

// ── Segments ──────────────────────────────────────────────────────────────────

const SegmentStatusSchema = z.enum(['planned', 'confirmed', 'completed', 'cancelled', 'modified']);

const BaseSegmentSchema = z.object({
  id: z.string(),
  status: SegmentStatusSchema.optional(),
  bookingRef: z.string().optional(),
  provider: z.string().optional(),
  notes: z.string().optional(),
  actualNotes: z.string().optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
});

const FlightLegSchema = z.object({
  flightNumber: z.string(),
  aircraft: z.string().optional(),
  durationMinutes: z.number().optional(),
  departure: z.object({
    iataCode: z.string().optional(),
    location: LocationSchema,
    datetime: ISODatetimeSchema,
    timezone: IANATimezoneSchema,
    terminal: z.string().optional(),
    gate: z.string().optional(),
  }),
  arrival: z.object({
    iataCode: z.string().optional(),
    location: LocationSchema,
    datetime: ISODatetimeSchema,
    timezone: IANATimezoneSchema,
    terminal: z.string().optional(),
  }),
});

const FlightSegmentSchema = BaseSegmentSchema.extend({
  type: z.literal('flight'),
  airline: z.string(),
  cabin: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
  legs: z.tuple([FlightLegSchema]).rest(FlightLegSchema),
});

const AccommodationSegmentSchema = BaseSegmentSchema.extend({
  type: z.literal('accommodation'),
  name: z.string(),
  location: LocationSchema,
  checkIn: ISODateSchema,
  checkOut: ISODateSchema,
  roomType: z.string().optional(),
  guests: z.number().optional(),
}).refine((seg) => seg.checkOut > seg.checkIn, {
  message: 'checkOut must be after checkIn',
  path: ['checkOut'],
});

const ActivitySegmentSchema = BaseSegmentSchema.extend({
  type: z.literal('activity'),
  name: z.string(),
  location: LocationSchema,
  schedule: z.union([
    z.object({ dates: z.array(ISODateSchema) }),
    z.object({ start: ISODateSchema, end: ISODateSchema }),
  ]),
  category: z.string().optional(),
});

const WaypointSchema = z.object({
  location: LocationSchema,
  datetime: ISODatetimeSchema.optional(),
  timezone: IANATimezoneSchema.optional(),
});

const TransferSegmentSchema = BaseSegmentSchema.extend({
  type: z.literal('transfer'),
  mode: z.string().optional(),
  waypoints: z.tuple([WaypointSchema, WaypointSchema]).rest(WaypointSchema),
});

const NoteSegmentSchema = BaseSegmentSchema.extend({
  type: z.literal('note'),
  title: z.string(),
  date: ISODateSchema,
  location: LocationSchema.optional(),
  body: z.string(),
});

const SegmentSchema = z.discriminatedUnion('type', [
  FlightSegmentSchema,
  AccommodationSegmentSchema,
  ActivitySegmentSchema,
  TransferSegmentSchema,
  NoteSegmentSchema,
]);

// ── Trip ──────────────────────────────────────────────────────────────────────

export const TripSchema = z
  .object({
    $schema: z.literal('2.0'),
    id: z.string().regex(/^[a-z0-9-]+$/, 'id must match ^[a-z0-9-]+$'),
    title: z.string(),
    description: z.string().optional(),
    coverPhotoId: z.string().optional(),
    dates: z.object({
      start: ISODateSchema,
      end: ISODateSchema,
    }),
    countries: z.array(CountryCodeSchema),
    tags: z.array(z.string()).optional(),
    days: z.array(DaySchema),
    segments: z.array(SegmentSchema),
    photos: z.array(PhotoSchema),
  })
  .refine((trip) => trip.dates.start <= trip.dates.end, {
    message: 'dates.start must be <= dates.end',
    path: ['dates', 'end'],
  });

export type Trip = z.infer<typeof TripSchema>;
