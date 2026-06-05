import { createHash, randomBytes } from 'crypto';

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

import { config } from '@shared/config/env';
import { ROLES } from '@shared/domain/constants';
import { UnauthorizedError, ConflictError, AppError } from '@shared/domain/errors';
import { logger } from '@shared/infrastructure/logger';

import type { IRefreshTokenRepository } from '../domain/refresh-token.repository.interface';
import type { User } from '../domain/user.entity';
import type { IUserRepository } from '../domain/user.repository.interface';
import type { JwtPayload } from '@shared/interface/middleware/auth';
import type { Role } from '@shared/domain/constants';

export interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RegisterInput extends LoginInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  isOrganizationAccount?: boolean;
  organizationName?: string;
  organizationType?: string;
  organizationRegNumber?: string;
  organizationWebsite?: string;
  organizationDescription?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenRepo: IRefreshTokenRepository,
  ) {}

  async register(input: RegisterInput): Promise<{ user: User; profile: Awaited<ReturnType<IUserRepository['upsertProfile']>>; tokens: AuthTokens }> {
    await AuthService.checkEmailUniqueness(input.email, this.userRepo);
    AuthService.validatePasswordStrength(input.password);

    const passwordHash = await AuthService.hashPassword(input.password);
    const user = await this.userRepo.create({
      email: input.email,
      passwordHash,
      roles: [ROLES.USER],
    });

    const profile = await this.userRepo.upsertProfile(user.id, {
      userId: user.id,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      isOrganizationAccount: input.isOrganizationAccount,
      organizationName: input.organizationName,
      organizationType: input.organizationType,
      organizationRegNumber: input.organizationRegNumber,
      organizationWebsite: input.organizationWebsite,
      organizationDescription: input.organizationDescription,
    });

    await this.userRepo.updateLastLogin(user.id);
    const tokens = await this.issueTokens(user, input.ipAddress, input.userAgent);
    logger.info({ userId: user.id }, 'User registered');
    return { user, profile, tokens };
  }

  async login(input: LoginInput): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.userRepo.findByEmail(input.email);

    // Generic error to prevent email enumeration
    if (!user || user.deletedAt) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled');
    }

    // Account lockout check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError(
        `Account locked. Try again after ${user.lockedUntil.toISOString()}`,
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, input.password);
    if (!passwordValid) {
      const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
      const lockUntil =
        newAttempts >= config.AUTH_MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + config.AUTH_LOCK_DURATION_MINUTES * 60 * 1000)
          : null;
      await this.userRepo.updateFailedAttempts(user.id, newAttempts, lockUntil);
      throw new UnauthorizedError('Invalid credentials');
    }

    // Reset failed attempts on success
    await this.userRepo.updateFailedAttempts(user.id, 0, null);
    await this.userRepo.updateLastLogin(user.id);

    const tokens = await this.issueTokens(user, input.ipAddress, input.userAgent);
    logger.info({ userId: user.id }, 'User logged in');
    return { user, tokens };
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const hash = this.hashToken(rawRefreshToken);
    const stored = await this.tokenRepo.findByTokenHash(hash);

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    await this.tokenRepo.revokeByTokenHash(hash);

    const user = await this.userRepo.findById(stored.userId);
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedError('User not found or inactive');
    }

    return this.issueTokens(user);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const hash = this.hashToken(rawRefreshToken);
    await this.tokenRepo.revokeByTokenHash(hash);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.tokenRepo.revokeByUserId(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    AuthService.validatePasswordStrength(newPassword);

    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedError('User not found or inactive');
    }

    const passwordValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!passwordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newHash = await AuthService.hashPassword(newPassword);
    await this.userRepo.updatePassword(userId, newHash);
    await this.tokenRepo.revokeByUserId(userId);
    logger.info({ userId }, 'Password changed, all sessions revoked');
  }

  private async issueTokens(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      roles: user.roles as Role[],
    };

    const accessToken = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const rawRefresh = randomBytes(64).toString('hex');
    const refreshHash = this.hashToken(rawRefresh);
    const expiresAt = this.parseExpiry(config.JWT_REFRESH_EXPIRES_IN);

    await this.tokenRepo.create({
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    };
  }

  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  static validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 422, 'WEAK_PASSWORD');
    }
  }

  static checkEmailUniqueness = async (
    email: string,
    userRepo: IUserRepository,
  ): Promise<void> => {
    const existing = await userRepo.findByEmail(email);
    if (existing) throw new ConflictError('Email already registered');
  };

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(expiry: string): Date {
    const match = /^(\d+)([smhd])$/.exec(expiry);
    if (!match) throw new Error(`Invalid expiry format: ${expiry}`);
    const [, num, unit] = match;
    const ms: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return new Date(Date.now() + parseInt(num, 10) * (ms[unit] ?? 0));
  }
}
