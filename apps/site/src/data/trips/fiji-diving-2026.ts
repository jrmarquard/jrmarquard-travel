import { TripSchema } from '../../schema/validate';
import type { Trip } from '../../schema/types';
import raw from './fiji-diving-2026.json';

export const trip: Trip = TripSchema.parse(raw);
