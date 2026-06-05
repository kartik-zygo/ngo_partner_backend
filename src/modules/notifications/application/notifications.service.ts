import { v4 as uuidv4 } from 'uuid';

import { db } from '@shared/infrastructure/database';
import { buildPaginationMeta } from '@shared/application/response';
import type { PaginationQuery } from '@shared/application/common-schemas';

export async function listNotifications(userId: string, pagination: PaginationQuery) {
  const q = db('user_notifications').where({ user_id: userId });
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const rows = await q.clone().orderBy('created_at', 'desc')
    .limit(pagination.limit).offset((pagination.page - 1) * pagination.limit)
    .select('*');
  return { data: rows, meta: buildPaginationMeta(parseInt(String(totalRow?.count ?? 0)), pagination.page, pagination.limit) };
}

export async function markRead(id: string, userId: string): Promise<void> {
  await db('user_notifications').where({ id, user_id: userId }).update({ is_read: true, read_at: new Date() });
}

export async function markAllRead(userId: string): Promise<void> {
  await db('user_notifications').where({ user_id: userId, is_read: false }).update({ is_read: true, read_at: new Date() });
}

export async function createNotification(data: {
  userId: string; title: string; body: string;
  notificationType: string; entityType?: string; entityId?: string;
}): Promise<void> {
  await db('user_notifications').insert({
    id: uuidv4(), user_id: data.userId, title: data.title, body: data.body,
    notification_type: data.notificationType, entity_type: data.entityType ?? null,
    entity_id: data.entityId ?? null,
  });
}
