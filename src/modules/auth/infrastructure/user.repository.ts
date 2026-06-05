import { v4 as uuidv4 } from 'uuid';

import { db } from '@shared/infrastructure/database';

import type { CreateUserInput, IUserRepository } from '../domain/user.repository.interface';
import type { User, UserProfile } from '../domain/user.entity';

interface RawUser {
  id: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  email_verified: boolean;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  roles: string; // aggregated from join
}

interface RawProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_organization_account: boolean;
  organization_name: string | null;
  organization_type: string | null;
  organization_reg_number: string | null;
  organization_website: string | null;
  organization_description: string | null;
  created_at: string;
  updated_at: string;
}

export class UserRepository implements IUserRepository {
  private async findWithRoles(
    where: Record<string, unknown>,
    conn: typeof db = db,
  ): Promise<User | null> {
    const row = await conn('users as u')
      .leftJoin('user_roles as ur', 'ur.user_id', 'u.id')
      .leftJoin('roles as r', 'r.id', 'ur.role_id')
      .where(where)
      .whereNull('u.deleted_at')
      .groupBy('u.id')
      .select<RawUser>(
        'u.*',
        conn.raw(`COALESCE(string_agg(r.name::text, ','), '') as roles`),
      )
      .first();

    return row ? this.mapUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    return this.findWithRoles({ 'u.id': id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findWithRoles({ 'u.email': email });
  }

  async create(data: CreateUserInput): Promise<User> {
    return db.transaction(async (trx: import('knex').Knex.Transaction) => {
      const userId = uuidv4();
      await trx('users').insert({
        id: userId,
        email: data.email,
        password_hash: data.passwordHash,
        is_active: true,
        email_verified: false,
        failed_login_attempts: 0,
      });

      // Resolve role IDs
      const roleRows = await trx('roles').whereIn('name', data.roles).select<{ id: string; name: string }[]>('id', 'name');
      if (roleRows.length > 0) {
        await trx('user_roles').insert(
          roleRows.map((r) => ({ id: uuidv4(), user_id: userId, role_id: r.id })),
        );
      }

      // Create empty profile
      await trx('user_profiles').insert({ id: uuidv4(), user_id: userId });

      const user = await this.findWithRoles({ 'u.id': userId }, trx);
      if (!user) throw new Error('User creation failed');
      return user;
    });
  }

  async updateFailedAttempts(
    userId: string,
    attempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    await db('users')
      .where({ id: userId })
      .update({ failed_login_attempts: attempts, locked_until: lockedUntil });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await db('users').where({ id: userId }).update({ last_login_at: new Date() });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await db('users').where({ id: userId }).update({ password_hash: passwordHash, updated_at: new Date() });
  }

  async findProfileByUserId(userId: string): Promise<UserProfile | null> {
    const row = await db('user_profiles')
      .where({ user_id: userId })
      .first<RawProfile | undefined>();
    return row ? this.mapProfile(row) : null;
  }

  async upsertProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.findProfileByUserId(userId);
    const now = new Date();

    if (existing) {
      await db('user_profiles')
        .where({ user_id: userId })
        .update({
          first_name: data.firstName ?? existing.firstName,
          last_name: data.lastName ?? existing.lastName,
          phone: data.phone ?? existing.phone,
          avatar_url: data.avatarUrl ?? existing.avatarUrl,
          is_organization_account: data.isOrganizationAccount ?? existing.isOrganizationAccount,
          organization_name: data.organizationName ?? existing.organizationName,
          organization_type: data.organizationType ?? existing.organizationType,
          organization_reg_number: data.organizationRegNumber ?? existing.organizationRegNumber,
          organization_website: data.organizationWebsite ?? existing.organizationWebsite,
          organization_description: data.organizationDescription ?? existing.organizationDescription,
          updated_at: now,
          updated_by: data.userId,
        });
    } else {
      await db('user_profiles').insert({
        id: uuidv4(),
        user_id: userId,
        first_name: data.firstName ?? null,
        last_name: data.lastName ?? null,
        phone: data.phone ?? null,
        avatar_url: data.avatarUrl ?? null,
        is_organization_account: data.isOrganizationAccount ?? false,
        organization_name: data.organizationName ?? null,
        organization_type: data.organizationType ?? null,
        organization_reg_number: data.organizationRegNumber ?? null,
        organization_website: data.organizationWebsite ?? null,
        organization_description: data.organizationDescription ?? null,
        created_at: now,
        updated_at: now,
      });
    }

    const profile = await this.findProfileByUserId(userId);
    if (!profile) throw new Error('Profile upsert failed');
    return profile;
  }

  private mapUser(row: RawUser): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      failedLoginAttempts: row.failed_login_attempts,
      lockedUntil: row.locked_until ? new Date(row.locked_until) : null,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
      roles: (row.roles ? row.roles.split(',').filter(Boolean) : []) as User['roles'],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    };
  }

  private mapProfile(row: RawProfile): UserProfile {
    return {
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      isOrganizationAccount: row.is_organization_account,
      organizationName: row.organization_name,
      organizationType: row.organization_type,
      organizationRegNumber: row.organization_reg_number,
      organizationWebsite: row.organization_website,
      organizationDescription: row.organization_description,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
