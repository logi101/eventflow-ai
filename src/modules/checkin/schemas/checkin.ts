import { z } from 'zod';

export const checkinSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  checkin_method: z.enum(['qr', 'manual', 'api', 'bulk']),
  checkin_time: z.string().datetime(),
  checkin_location: z.string().optional(),
  device_info: z.string().optional(),
  ip_address: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const checkinCreateSchema = checkinSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const checkinUpdateSchema = checkinSchema.partial().pick({
  checkin_location: true,
  notes: true,
  updated_at: true,
});

export type Checkin = z.infer<typeof checkinSchema>;
export type CheckinCreate = z.infer<typeof checkinCreateSchema>;
export type CheckinUpdate = z.infer<typeof checkinUpdateSchema>;