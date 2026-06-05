import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().min(1).max(500),
  description: z.string().min(1).max(10000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  caseId: z.string().uuid().optional(),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(['open', 'inProgress', 'waitingForUser', 'resolved', 'closed']),
  message: z.string().max(5000).optional(),
  isInternal: z.boolean().default(false),
});

export const assignTicketSchema = z.object({
  assignedTo: z.string().uuid(),
});

export const escalateTicketSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export const addTicketUpdateSchema = z.object({
  message: z.string().min(1).max(10000),
  isInternal: z.boolean().default(false),
});

export type CreateTicketDto = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusDto = z.infer<typeof updateTicketStatusSchema>;
