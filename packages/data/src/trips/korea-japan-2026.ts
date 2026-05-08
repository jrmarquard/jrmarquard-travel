import { TripSchema } from '../schema/validate.js';
import type { Trip } from '../schema/types.js';
import raw from './korea-japan-2026.json' with { type: 'json' };

export const koreaJapan2026: Trip = TripSchema.parse(raw);
