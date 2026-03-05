import { z } from "zod";

export const bookingSettingsSchema = z.object({
  club_id: z.string().uuid(),
  timezone: z.string().min(1).default("America/Argentina/Buenos_Aires"),
  slot_duration_minutes: z.coerce.number().int().min(30).max(240),
  buffer_minutes: z.coerce.number().int().min(0).max(120),
  opening_hours: z
    .string()
    .optional()
    .default("")
    .transform((value, ctx) => {
      const trimmed = value.trim();
      if (!trimmed) return {};
      try {
        return JSON.parse(trimmed);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "JSON invalido en horarios de apertura",
        });
        return z.NEVER;
      }
    }),
});

export const createCourtSchema = z.object({
  club_id: z.string().uuid(),
  name: z.string().trim().min(1, "Nombre requerido"),
  surface_type: z.enum(["synthetic", "hard", "clay", "other"]),
  is_indoor: z.coerce.boolean().default(false),
  opening_time: z.string().regex(/^\d{2}:\d{2}$/, "Horario apertura invalido").default("09:00"),
  closing_time: z.string().regex(/^\d{2}:\d{2}$/, "Horario cierre invalido").default("23:00"),
  slot_interval_minutes: z.coerce.number().int().min(30).max(240).default(90),
});

export const updateCourtSchema = z.object({
  court_id: z.string().uuid(),
  name: z.string().trim().min(1).optional(),
  surface_type: z.enum(["synthetic", "hard", "clay", "other"]).optional(),
  is_indoor: z.boolean().optional(),
  active: z.boolean().optional(),
  opening_time: z.string().regex(/^\d{2}:\d{2}$/, "Horario apertura invalido"),
  closing_time: z.string().regex(/^\d{2}:\d{2}$/, "Horario cierre invalido"),
  slot_interval_minutes: z.coerce.number().int().min(30).max(240),
});

export const requestBookingSchema = z.object({
  club_id: z.string().uuid(),
  court_id: z.string().uuid(),
  start_at: z.string().datetime({ offset: true }),
  end_at: z.string().datetime({ offset: true }),
  note: z.string().max(500).optional(),
});

export const clubCreateBookingMatchSchema = z.object({
  club_id: z.string().uuid(),
  court_id: z.string().uuid(),
  player_id: z.string().uuid(),
  start_at: z.string().datetime({ offset: true }),
  end_at: z.string().datetime({ offset: true }),
  note: z.string().max(500).optional(),
});

export const bookingIdSchema = z.object({
  booking_id: z.string().uuid(),
});

export const rejectBookingSchema = z.object({
  booking_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>;
export type CreateCourtInput = z.infer<typeof createCourtSchema>;
export type UpdateCourtInput = z.infer<typeof updateCourtSchema>;
export type RequestBookingInput = z.infer<typeof requestBookingSchema>;
export type ClubCreateBookingMatchInput = z.infer<typeof clubCreateBookingMatchSchema>;
