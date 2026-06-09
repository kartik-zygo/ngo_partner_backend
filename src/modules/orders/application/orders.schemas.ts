import { z } from 'zod';

export const createOrderSchema = z.object({
  serviceId: z.string().uuid('serviceId must be a valid UUID'),
  customerPhone: z
    .string()
    .regex(/^\d{10}$/, 'Phone must be exactly 10 digits')
    .optional(),
  notes: z.string().max(500).optional(),
});

// Valid transitions for admin/sales fulfillment management
export const FULFILLMENT_STATUSES = ['processing', 'completed', 'refund_initiated', 'refunded'] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const updateFulfillmentSchema = z.object({
  fulfillmentStatus: z.enum(FULFILLMENT_STATUSES),
  adminNotes: z.string().max(2000).optional(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // Payment status filter
  status: z.enum(['pending', 'paid', 'failed', 'cancelled', 'expired']).optional(),
  // Fulfillment status filter (admin/sales)
  fulfillmentStatus: z.enum([...FULFILLMENT_STATUSES, 'none'] as const).optional(),
  // Admin-only filters
  serviceId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  // Search across customer name / email / phone
  search: z.string().max(255).optional(),
  // Date range on created_at (ISO strings)
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type UpdateFulfillmentInput = z.infer<typeof updateFulfillmentSchema>;
