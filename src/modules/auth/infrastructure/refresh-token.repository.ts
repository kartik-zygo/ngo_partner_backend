import { v4 as uuidv4 } from 'uuid';

import { db } from '@shared/infrastructure/database';

import type { CreateRefreshTokenInput, IRefreshTokenRepository, RefreshTokenRecord } from '../domain/refresh-token.repository.interface';

export class RefreshTokenRepository implements IRefreshTokenRepository {
  async create(data: CreateRefreshTokenInput): Promise<void> {
    await db('refresh_tokens').insert({
      id: uuidv4(),
      user_id: data.userId,
      token_hash: data.tokenHash,
      expires_at: data.expiresAt,
      revoked: false,
      ip_address: data.ipAddress ?? null,
      user_agent: data.userAgent ?? null,
    });
  }

  async findByTokenHash(hash: string): Promise<RefreshTokenRecord | null> {
    const row = await db('refresh_tokens')
      .where({ token_hash: hash })
      .first<RawRow | undefined>();
    return row ? this.map(row) : null;
  }

  async revokeByUserId(userId: string): Promise<void> {
    await db('refresh_tokens').where({ user_id: userId }).update({ revoked: true });
  }

  async revokeByTokenHash(hash: string): Promise<void> {
    await db('refresh_tokens').where({ token_hash: hash }).update({ revoked: true });
  }

  async deleteExpired(): Promise<void> {
    await db('refresh_tokens').where('expires_at', '<', new Date()).delete();
  }

  private map(row: RawRow): RefreshTokenRecord {
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: new Date(row.expires_at),
      revoked: row.revoked,
    };
  }
}

interface RawRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked: boolean;
}
