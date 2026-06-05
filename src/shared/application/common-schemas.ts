import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const uuidParam = z.object({
  id: z.string().uuid('Invalid UUID'),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;
export type SortQuery = z.infer<typeof sortSchema>;
