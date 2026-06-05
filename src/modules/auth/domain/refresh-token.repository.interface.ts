export interface IRefreshTokenRepository {
  create(data: CreateRefreshTokenInput): Promise<void>;
  findByTokenHash(hash: string): Promise<RefreshTokenRecord | null>;
  revokeByUserId(userId: string): Promise<void>;
  revokeByTokenHash(hash: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
}

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}
