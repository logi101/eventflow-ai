import { z } from 'zod'

export const roomPolicySchema = z.object({
  gender_separation: z.enum(['mixed', 'full_separation', 'male_separate', 'female_separate']).default('mixed'),
  couple_same_room: z.boolean().default(true),
  vip_priority: z.boolean().default(true),
  accessible_priority: z.boolean().default(true),
})

export const participantGroupSchema = z.object({
  name: z.string().min(1, 'שם קבוצה הוא שדה חובה').max(200),
  group_type: z.enum(['family', 'friends', 'track', 'team', 'custom']).default('custom'),
  prefer_same_room: z.boolean().default(false),
  prefer_adjacent: z.boolean().default(true),
  notes: z.string().nullable().optional(),
})

export type RoomPolicyFormData = z.infer<typeof roomPolicySchema>
export type ParticipantGroupFormData = z.infer<typeof participantGroupSchema>
