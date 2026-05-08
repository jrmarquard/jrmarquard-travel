import { TripSchema } from '../schema/validate.js';
import type { Trip } from '../schema/types.js';
import raw from './fiji-diving-2026.json' with { type: 'json' };

export const fijiDiving2026: Trip = TripSchema.parse(raw);
