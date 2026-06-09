import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  basePrice: z.number().nonnegative().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const listServicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().max(100).optional(),
  search: z.string().max(255).optional(),
  // ADMIN only — when true returns inactive services too
  includeInactive: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateServiceDto = z.infer<typeof createServiceSchema>;
export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
