import { z } from 'zod';

export const createTaskSchema = z.object({
  leadId: z.string().uuid().optional(),
  assignedTo: z.string().uuid(),
  description: z.string().min(1).max(2000),
  dueAt: z.string().datetime({ offset: true }).optional(),
});

export const rescheduleTaskSchema = z.object({
  dueAt: z.string().datetime({ offset: true }),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type RescheduleTaskDto = z.infer<typeof rescheduleTaskSchema>;
