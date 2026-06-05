import type { User, UserProfile } from './user.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserInput): Promise<User>;
  updateFailedAttempts(userId: string, attempts: number, lockedUntil: Date | null): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  findProfileByUserId(userId: string): Promise<UserProfile | null>;
  upsertProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile>;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  roles: string[];
}
