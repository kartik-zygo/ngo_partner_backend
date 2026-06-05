import { z } from 'zod';

export const createTeamMemberSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
});

export const updateTeamMemberSchema = z
  .object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    phone: z.string().max(30).optional(),
    avatarUrl: z.string().url().max(500).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });
