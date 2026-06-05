import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { db } from '@shared/infrastructure/database';
import { NotFoundError } from '@shared/domain/errors';
import { buildPaginationMeta } from '@shared/application/response';
import type { PaginationQuery } from '@shared/application/common-schemas';

export const createApprovalSchema = z.object({
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid(),
  reason: z.string().min(1).max(2000),
});

export const approvalDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  decisionNotes: z.string().max(2000).optional(),
});

interface RawApproval {
  id: string; requested_by: string; entity_type: string; entity_id: string;
  reason: string; status: string; decided_by: string | null;
  decision_notes: string | null; decided_at: string | null;
  created_at: string; updated_at: string;
}

function mapApproval(r: RawApproval) {
  return { id: r.id, requestedBy: r.requested_by, entityType: r.entity_type, entityId: r.entity_id,
    reason: r.reason, status: r.status, decidedBy: r.decided_by,
    decisionNotes: r.decision_notes, decidedAt: r.decided_at ? new Date(r.decided_at) : null,
    createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at) };
}

export async function getApproval(id: string) {
  const row = await db('approval_requests').where({ id }).first<RawApproval | undefined>();
  if (!row) throw new NotFoundError('ApprovalRequest', id);
  return mapApproval(row);
}

export async function listApprovals(pagination: PaginationQuery, status?: string) {
  const q = db('approval_requests');
  if (status) q.where({ status });
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const rows = await q.clone().orderBy('created_at', 'desc').limit(pagination.limit).offset((pagination.page - 1) * pagination.limit).select<RawApproval[]>('*');
  return { data: rows.map(mapApproval), meta: buildPaginationMeta(parseInt(String(totalRow?.count ?? 0)), pagination.page, pagination.limit) };
}

export async function createApproval(data: z.infer<typeof createApprovalSchema>, actorId: string) {
  const id = uuidv4();
  await db('approval_requests').insert({ id, requested_by: actorId, entity_type: data.entityType, entity_id: data.entityId, reason: data.reason, status: 'pending' });
  return getApproval(id);
}

export async function decideApproval(id: string, data: z.infer<typeof approvalDecisionSchema>, actorId: string) {
  await getApproval(id);
  await db('approval_requests').where({ id }).update({ status: data.status, decided_by: actorId, decision_notes: data.decisionNotes ?? null, decided_at: new Date(), updated_at: new Date() });
  return getApproval(id);
}
