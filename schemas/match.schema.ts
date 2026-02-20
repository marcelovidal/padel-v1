import { z } from "zod";

export const matchStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);
export const teamTypeSchema = z.enum(["A", "B"]);

export const createMatchSchema = z.object({
  match_at: z.string().datetime("Fecha y hora invalida"),
  club_name: z.string().min(1, "El nombre del club es requerido").max(200),
  club_id: z.string().uuid().nullable().optional(),
  max_players: z.number().int().min(2).max(4).default(4),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateMatchSchema = createMatchSchema.partial().extend({
  id: z.string().uuid(),
});

export const addPlayerToMatchSchema = z.object({
  match_id: z.string().uuid(),
  player_id: z.string().uuid(),
  team: teamTypeSchema,
});

export const matchResultSetSchema = z.object({
  a: z.number().int().min(0),
  b: z.number().int().min(0),
});

export const createMatchResultSchema = z.object({
  match_id: z.string().uuid(),
  sets: z.array(matchResultSetSchema).min(1).max(5),
  winner_team: teamTypeSchema,
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
export type AddPlayerToMatchInput = z.infer<typeof addPlayerToMatchSchema>;
export type CreateMatchResultInput = z.infer<typeof createMatchResultSchema>;
export type MatchResultSet = z.infer<typeof matchResultSetSchema>;
