// ── Primitives ────────────────────────────────────────────────────────────────

type ISODate = string;         // "2026-05-15"
type ISODatetime = string;     // "2026-05-15T13:15:00+10:00"
type IANATimezone = string;    // "Australia/Sydney"
type CountryCode = string;     // "AU"

// ── Location ──────────────────────────────────────────────────────────────────

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface Location {
  name: string;
  geocodeName?: string;
  region?: string;
  country: CountryCode;
  countryName: string;
  coordinates?: GeoCoordinates;
}

export interface TransitLocation {
  kind: "in-air" | "at-sea" | "overland";
  description?: string;
  waypoints: [Location, Location, ...Location[]];
}

export type AnyLocation = Location | TransitLocation;

// ── Photos ────────────────────────────────────────────────────────────────────

export interface PhotoSource {
  sha256: string;
  sizeBytes: number;
  originalFilename: string;
  exif: {
    datetimeOriginal: string;
    gps?: GeoCoordinates;
    cameraMake?: string;
    cameraModel?: string;
    focalLength?: string;
  };
}

export interface Photo {
  id: string;
  filename: string;
  date: ISODate;
  stopId?: string;
  takenAt?: ISODatetime;
  caption?: string;
  alt?: string;
  source: PhotoSource;
}

// ── Stops ─────────────────────────────────────────────────────────────────────

export interface Stop {
  id: string;
  location: AnyLocation;
  arrival?: ISODatetime;
  departure?: ISODatetime;
  timezone?: IANATimezone;
  title?: string;
  notes?: string;
}

// ── Days ──────────────────────────────────────────────────────────────────────

export interface Day {
  date: ISODate;
  title?: string;
  primaryStopId: string;
  stops: Stop[];
  notes?: string;
}

// ── Segments ──────────────────────────────────────────────────────────────────

export type SegmentStatus =
  | "planned"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "modified";

interface BaseSegment {
  id: string;
  type: string;
  status?: SegmentStatus;
  bookingRef?: string;
  provider?: string;
  notes?: string;
  actualNotes?: string;
  inclusions?: string[];
  exclusions?: string[];
}

export interface FlightLeg {
  flightNumber: string;
  aircraft?: string;
  durationMinutes?: number;
  departure: {
    iataCode?: string;
    location: Location;
    datetime: ISODatetime;
    timezone: IANATimezone;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    iataCode?: string;
    location: Location;
    datetime: ISODatetime;
    timezone: IANATimezone;
    terminal?: string;
  };
}

export interface FlightSegment extends BaseSegment {
  type: "flight";
  airline: string;
  cabin?: "economy" | "premium_economy" | "business" | "first";
  legs: [FlightLeg, ...FlightLeg[]];
}

export interface AccommodationSegment extends BaseSegment {
  type: "accommodation";
  name: string;
  location: Location;
  checkIn: ISODate;
  checkOut: ISODate;
  roomType?: string;
  guests?: number;
}

export interface ActivitySegment extends BaseSegment {
  type: "activity";
  name: string;
  location: Location;
  schedule:
    | { dates: ISODate[] }
    | { start: ISODate; end: ISODate };
  category?: string;
}

export interface TransferSegment extends BaseSegment {
  type: "transfer";
  mode?: string;
  waypoints: [
    { location: Location; datetime?: ISODatetime; timezone?: IANATimezone },
    { location: Location; datetime?: ISODatetime; timezone?: IANATimezone },
    ...{ location: Location; datetime?: ISODatetime; timezone?: IANATimezone }[]
  ];
}

export interface NoteSegment extends BaseSegment {
  type: "note";
  title: string;
  date: ISODate;
  location?: Location;
  body: string;
}

export type Segment =
  | FlightSegment
  | AccommodationSegment
  | ActivitySegment
  | TransferSegment
  | NoteSegment;

// ── Trip ──────────────────────────────────────────────────────────────────────

export interface Trip {
  $schema: "2.0";
  id: string;
  title: string;
  description?: string;
  coverPhotoId?: string;
  dates: {
    start: ISODate;
    end: ISODate;
  };
  countries: CountryCode[];
  tags?: string[];
  days: Day[];
  segments: Segment[];
  photos: Photo[];
}
