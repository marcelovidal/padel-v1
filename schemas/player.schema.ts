import { z } from "zod";

export const playerPositionSchema = z.enum(["drive", "reves", "cualquiera"]);
export const playerStatusSchema = z.enum(["active", "inactive"]);
export const playerCategorySchema = z.number().min(1).max(7);

export const createPlayerSchema = z.object({
  first_name: z.string().min(1, "El nombre es requerido").max(100),
  last_name: z.string().min(1, "El apellido es requerido").max(100),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? undefined : val)),
  phone: z
    .string()
    .min(1, "El teléfono es requerido")
    .max(20)
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, "Formato de teléfono inválido"),
  position: playerPositionSchema.default("cualquiera"),
  status: playerStatusSchema.default("active"),
  category: playerCategorySchema.default(5),
});

export const updatePlayerSchema = createPlayerSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;


