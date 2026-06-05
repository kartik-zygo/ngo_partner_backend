import { z } from 'zod';

export const createLeadSchema = z.object({
  userId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  source: z.enum(['userApp', 'manual', 'campaign', 'collaboration']).default('manual'),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().max(255).optional(),
  contactPhone: z.string().max(30).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateLeadStatusSchema = z.object({
  status: z.enum(['newLead', 'contacted', 'qualified', 'proposalSent', 'won', 'lost']),
  reason: z.string().max(500).optional(),
});

export const addLeadNoteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const assignLeadSchema = z.object({
  assignedTo: z.string().uuid(),
});

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['newLead', 'contacted', 'qualified', 'proposalSent', 'won', 'lost']).optional(),
  source: z.enum(['userApp', 'manual', 'campaign', 'collaboration']).optional(),
  assignedTo: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateLeadDto = z.infer<typeof createLeadSchema>;
export type UpdateLeadStatusDto = z.infer<typeof updateLeadStatusSchema>;
export type AddLeadNoteDto = z.infer<typeof addLeadNoteSchema>;
export type AssignLeadDto = z.infer<typeof assignLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
