import { z } from 'zod';

const profileFieldsSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  isOrganizationAccount: z.boolean().optional(),
  organizationName: z.string().max(255).optional(),
  organizationType: z.string().max(100).optional(),
  organizationRegNumber: z.string().max(100).optional(),
  organizationWebsite: z.string().url().max(500).optional().or(z.literal('')),
  organizationDescription: z.string().max(2000).optional(),
});

export const registerSchema = z
  .object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(8),
  })
  .merge(profileFieldsSchema);

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateProfileSchema = profileFieldsSchema;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
