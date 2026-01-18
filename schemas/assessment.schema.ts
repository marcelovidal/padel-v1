import { z } from "zod";

export const createAssessmentSchema = z.object({
  match_id: z.string().uuid(),
  player_id: z.string().uuid(),
  volea: z.number().int().min(1).max(5).nullable().optional(),
  globo: z.number().int().min(1).max(5).nullable().optional(),
  remate: z.number().int().min(1).max(5).nullable().optional(),
  bandeja: z.number().int().min(1).max(5).nullable().optional(),
  vibora: z.number().int().min(1).max(5).nullable().optional(),
  bajada_pared: z.number().int().min(1).max(5).nullable().optional(),
  saque: z.number().int().min(1).max(5).nullable().optional(),
  recepcion_saque: z.number().int().min(1).max(5).nullable().optional(),
  comments: z.string().nullable().optional(),
  submitted_by: z.string().uuid().nullable().optional(),
});

// Require at least one non-null score or non-empty comments
export const createAssessmentRefined = createAssessmentSchema.refine((val) => {
  const scores = [
    val.volea,
    val.globo,
    val.remate,
    val.bandeja,
    val.vibora,
    val.bajada_pared,
    val.saque,
    val.recepcion_saque,
  ];
  const hasScore = scores.some((s) => typeof s === 'number');
  const hasComment = typeof val.comments === 'string' && val.comments.trim() !== '';
  return hasScore || hasComment;
}, {
  message: 'Debe completar al menos un golpe o un comentario',
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
