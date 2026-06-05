import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import argon2 from 'argon2';

import { db } from '@shared/infrastructure/database';
import { ConflictError, NotFoundError } from '@shared/domain/errors';
import { buildPaginationMeta } from '@shared/application/response';
import { ROLES } from '@shared/domain/constants';

interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  tempPassword?: string;
}

export class AdminTeamService {
  async list(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [members, countRows] = await Promise.all([
      db('users as u')
        .join('user_roles as ur', 'ur.user_id', 'u.id')
        .join('roles as r', 'r.id', 'ur.role_id')
        .leftJoin('user_profiles as up', 'up.user_id', 'u.id')
        .where('r.name', ROLES.SALES)
        .whereNull('u.deleted_at')
        .select(
          'u.id',
          'u.email',
          'u.is_active',
          'u.last_login_at',
          'u.created_at',
          'up.first_name',
          'up.last_name',
          'up.phone',
          'up.avatar_url',
        )
        .orderBy('u.created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db('users as u')
        .join('user_roles as ur', 'ur.user_id', 'u.id')
        .join('roles as r', 'r.id', 'ur.role_id')
        .where('r.name', ROLES.SALES)
        .whereNull('u.deleted_at')
        .count<{ count: string }[]>('u.id as count'),
    ]);

    const total = Number(countRows[0]?.count ?? 0);

    return {
      data: members.map((m) => this.mapRow(m)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string): Promise<TeamMember> {
    const member = await this.findMember(id);
    if (!member) throw new NotFoundError('Team member', id);
    return member;
  }

  async create(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }): Promise<TeamMember> {
    const existing = await db('users').where({ email: data.email }).whereNull('deleted_at').first();
    if (existing) throw new ConflictError('Email already registered');

    const tempPassword = AdminTeamService.generateTempPassword();
    const passwordHash = await argon2.hash(tempPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    return db.transaction(async (trx) => {
      const userId = uuidv4();
      await trx('users').insert({
        id: userId,
        email: data.email,
        password_hash: passwordHash,
        is_active: true,
        email_verified: false,
        failed_login_attempts: 0,
      });

      const salesRole = await trx('roles').where({ name: ROLES.SALES }).first<{ id: string }>();
      if (!salesRole) throw new Error('SALES role not found — run migrations to seed base roles');
      await trx('user_roles').insert({ id: uuidv4(), user_id: userId, role_id: salesRole.id });

      await trx('user_profiles').insert({
        id: uuidv4(),
        user_id: userId,
        first_name: data.firstName ?? null,
        last_name: data.lastName ?? null,
        phone: data.phone ?? null,
      });

      const member = await this.findMember(userId, trx);
      if (!member) throw new Error('Team member creation failed');
      return { ...member, tempPassword };
    });
  }

  private static generateTempPassword(): string {
    const charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#$!';
    const bytes = randomBytes(12);
    return Array.from(bytes, (b) => charset[b % charset.length]).join('');
  }

  async update(
    id: string,
    data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string },
  ): Promise<TeamMember> {
    const member = await this.findMember(id);
    if (!member) throw new NotFoundError('Team member', id);

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (data.firstName !== undefined) updates.first_name = data.firstName;
    if (data.lastName !== undefined) updates.last_name = data.lastName;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;

    await db('user_profiles').where({ user_id: id }).update(updates);
    return (await this.findMember(id))!;
  }

  async toggle(id: string): Promise<TeamMember> {
    const member = await this.findMember(id);
    if (!member) throw new NotFoundError('Team member', id);

    await db('users').where({ id }).update({ is_active: !member.isActive });
    return (await this.findMember(id))!;
  }

  async softDelete(id: string): Promise<void> {
    const member = await this.findMember(id);
    if (!member) throw new NotFoundError('Team member', id);

    await db('users').where({ id }).update({ deleted_at: new Date(), is_active: false });
  }

  private async findMember(id: string, conn: typeof db = db): Promise<TeamMember | null> {
    const row = await conn('users as u')
      .join('user_roles as ur', 'ur.user_id', 'u.id')
      .join('roles as r', 'r.id', 'ur.role_id')
      .leftJoin('user_profiles as up', 'up.user_id', 'u.id')
      .where('u.id', id)
      .where('r.name', ROLES.SALES)
      .whereNull('u.deleted_at')
      .select(
        'u.id',
        'u.email',
        'u.is_active',
        'u.last_login_at',
        'u.created_at',
        'up.first_name',
        'up.last_name',
        'up.phone',
        'up.avatar_url',
      )
      .first();

    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: Record<string, unknown>): TeamMember {
    return {
      id: row.id as string,
      email: row.email as string,
      firstName: (row.first_name as string | null) ?? null,
      lastName: (row.last_name as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      avatarUrl: (row.avatar_url as string | null) ?? null,
      isActive: row.is_active as boolean,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string) : null,
      createdAt: new Date(row.created_at as string),
    };
  }
}
