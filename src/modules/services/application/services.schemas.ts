import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  basePrice: z.number().nonnegative().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();
export type CreateServiceDto = z.infer<typeof createServiceSchema>;
export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;
