import type { Role } from '@shared/domain/constants';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isOrganizationAccount: boolean;
  organizationName: string | null;
  organizationType: string | null;
  organizationRegNumber: string | null;
  organizationWebsite: string | null;
  organizationDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}
