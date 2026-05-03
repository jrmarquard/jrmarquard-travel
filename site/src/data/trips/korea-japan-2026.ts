import { TripSchema } from '../../schema/validate';
import type { Trip } from '../../schema/types';

const raw = {
  $schema: '2.0',
  id: 'korea-japan-2026',
  title: 'Korea / Japan',
  dates: { start: '2026-03-20', end: '2026-03-25' },
  countries: ['KR', 'JP'],
  days: [
    {
      date: '2026-03-20',
      title: 'Jeju, South Korea',
      primaryStopId: 'stop-jeju',
      stops: [
        {
          id: 'stop-jeju',
          location: {
            name: 'Jeju',
            country: 'KR',
            countryName: 'South Korea',
            coordinates: { lat: 33.4996, lng: 126.5312 },
          },
          timezone: 'Asia/Seoul',
        },
      ],
    },
    {
      date: '2026-03-21',
      title: 'Arrived in Osaka',
      primaryStopId: 'stop-osaka-1',
      stops: [
        {
          id: 'stop-osaka-1',
          location: {
            name: 'Osaka',
            country: 'JP',
            countryName: 'Japan',
            coordinates: { lat: 34.6937, lng: 135.5023 },
          },
          timezone: 'Asia/Tokyo',
        },
      ],
    },
    {
      date: '2026-03-22',
      title: 'Osaka',
      primaryStopId: 'stop-osaka-2',
      stops: [
        {
          id: 'stop-osaka-2',
          location: {
            name: 'Osaka',
            country: 'JP',
            countryName: 'Japan',
            coordinates: { lat: 34.6937, lng: 135.5023 },
          },
          timezone: 'Asia/Tokyo',
        },
      ],
    },
    {
      date: '2026-03-23',
      title: 'Kanazawa',
      primaryStopId: 'stop-kanazawa',
      stops: [
        {
          id: 'stop-kanazawa',
          location: {
            name: 'Kanazawa',
            country: 'JP',
            countryName: 'Japan',
            coordinates: { lat: 36.5611, lng: 136.6565 },
          },
          timezone: 'Asia/Tokyo',
        },
      ],
    },
    {
      date: '2026-03-24',
      title: 'Noto Peninsula',
      primaryStopId: 'stop-noto',
      stops: [
        {
          id: 'stop-noto',
          location: {
            name: 'Noto',
            region: 'Noto Peninsula',
            country: 'JP',
            countryName: 'Japan',
            coordinates: { lat: 36.8531, lng: 136.7545 },
          },
          timezone: 'Asia/Tokyo',
        },
      ],
    },
    {
      date: '2026-03-25',
      title: 'Toyama',
      primaryStopId: 'stop-toyama',
      stops: [
        {
          id: 'stop-toyama',
          location: {
            name: 'Toyama',
            country: 'JP',
            countryName: 'Japan',
            coordinates: { lat: 36.6953, lng: 137.2113 },
          },
          timezone: 'Asia/Tokyo',
        },
      ],
    },
  ],
  segments: [],
  photos: [
    {
      id: '01_20260320_110254_jeju-korea',
      filename: '01_20260320_110254_jeju-korea.jpg',
      date: '2026-03-20',
      stopId: 'stop-jeju',
      takenAt: '2026-03-20T11:02:54+09:00',
      source: {
        sha256: 'dd9dae36814d9bb1c445b8cfef1675141608536191c0c4054b7005973f439fb4',
        sizeBytes: 195058,
        originalFilename: '01_20260320_110254_jeju-korea.jpg',
        exif: {
          datetimeOriginal: '2026:03:20 11:02:54',
          gps: { lat: 33.4294, lng: 126.9348 },
        },
      },
    },
    {
      id: '02_20260320_130603_jeju-korea',
      filename: '02_20260320_130603_jeju-korea.jpg',
      date: '2026-03-20',
      stopId: 'stop-jeju',
      takenAt: '2026-03-20T13:06:03+09:00',
      source: {
        sha256: '7681ae57163ca37500d3a7ad60844b682632f1997a4ef86be92efbc79c6b8ecb',
        sizeBytes: 144413,
        originalFilename: '02_20260320_130603_jeju-korea.jpg',
        exif: {
          datetimeOriginal: '2026:03:20 13:06:03',
          gps: { lat: 33.3791, lng: 126.88 },
        },
      },
    },
    {
      id: '03_20260321_223534_osaka-japan',
      filename: '03_20260321_223534_osaka-japan.jpg',
      date: '2026-03-21',
      stopId: 'stop-osaka-1',
      takenAt: '2026-03-21T22:35:34+09:00',
      source: {
        sha256: '9757dcc33bf50416f1ec7e7b2d714b2ed8f23a49712d20f34c057c118ea370f0',
        sizeBytes: 218751,
        originalFilename: '03_20260321_223534_osaka-japan.jpg',
        exif: {
          datetimeOriginal: '2026:03:21 22:35:34',
          gps: { lat: 34.6711, lng: 135.4993 },
        },
      },
    },
    {
      id: '04_20260322_131901_osaka-japan',
      filename: '04_20260322_131901_osaka-japan.jpg',
      date: '2026-03-22',
      stopId: 'stop-osaka-2',
      takenAt: '2026-03-22T13:19:01+09:00',
      source: {
        sha256: '6eee642e3302ae978509337dbc6258f68957bee3e535155961bd7551a19429ab',
        sizeBytes: 102949,
        originalFilename: '04_20260322_131901_osaka-japan.jpg',
        exif: {
          datetimeOriginal: '2026:03:22 13:19:01',
          gps: { lat: 34.6547, lng: 135.4291 },
        },
      },
    },
    {
      id: '05_20260324_105355_noto-japan',
      filename: '05_20260324_105355_noto-japan.jpg',
      date: '2026-03-24',
      stopId: 'stop-noto',
      takenAt: '2026-03-24T10:53:55+09:00',
      source: {
        sha256: '115fa434ae85cca19e296d4882bcea0323a3435b721b93bd4bf0c05d63e12331',
        sizeBytes: 81078,
        originalFilename: '05_20260324_105355_noto-japan.jpg',
        exif: {
          datetimeOriginal: '2026:03:24 10:53:55',
          gps: { lat: 36.8531, lng: 136.7545 },
        },
      },
    },
    {
      id: '06_20260325_135314_toyama-japan',
      filename: '06_20260325_135314_toyama-japan.jpg',
      date: '2026-03-25',
      stopId: 'stop-toyama',
      takenAt: '2026-03-25T13:53:14+09:00',
      source: {
        sha256: '31a01d3e106c83c6d7d05c15af11ebed5d4e7312fc35e609646e1b19cf5c75fb',
        sizeBytes: 105679,
        originalFilename: '06_20260325_135314_toyama-japan.jpg',
        exif: {
          datetimeOriginal: '2026:03:25 13:53:14',
          gps: { lat: 36.6741, lng: 137.8455 },
        },
      },
    },
  ],
};

export const trip: Trip = TripSchema.parse(raw);
