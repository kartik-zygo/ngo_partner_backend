import { v4 as uuidv4 } from 'uuid';

import { db } from '@shared/infrastructure/database';
import { buildPaginationMeta } from '@shared/application/response';
import type { PaginationQuery } from '@shared/application/common-schemas';

export interface AuditEntry {
  actorId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  correlationId?: string;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await db('audit_logs').insert({
    id: uuidv4(),
    actor_id: entry.actorId ?? null,
    actor_email: entry.actorEmail ?? null,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    before: entry.before ? JSON.stringify(entry.before) : null,
    after: entry.after ? JSON.stringify(entry.after) : null,
    ip_address: entry.ipAddress ?? null,
    correlation_id: entry.correlationId ?? null,
    created_at: new Date(),
  });
}

export async function listAuditLogs(
  pagination: PaginationQuery,
  filters: { entityType?: string; entityId?: string; actorId?: string },
) {
  const q = db('audit_logs');
  if (filters.entityType) q.where({ entity_type: filters.entityType });
  if (filters.entityId) q.where({ entity_id: filters.entityId });
  if (filters.actorId) q.where({ actor_id: filters.actorId });
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const rows = await q.clone().orderBy('created_at', 'desc')
    .limit(pagination.limit).offset((pagination.page - 1) * pagination.limit).select('*');
  return { data: rows, meta: buildPaginationMeta(parseInt(String(totalRow?.count ?? 0)), pagination.page, pagination.limit) };
}
