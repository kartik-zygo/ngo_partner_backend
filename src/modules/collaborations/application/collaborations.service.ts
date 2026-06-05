import { v4 as uuidv4 } from 'uuid';
import type { Knex } from 'knex';
import { z } from 'zod';

import { db } from '@shared/infrastructure/database';
import { NotFoundError } from '@shared/domain/errors';
import { buildPaginationMeta } from '@shared/application/response';
import type { PaginationQuery } from '@shared/application/common-schemas';

export const createCollabSchema = z.object({
  type: z.enum(['fundingPartner', 'resourceSharing', 'csrPartner', 'technical']),
  proposal: z.string().max(5000).optional(),
});

export const updateCollabStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  reviewNotes: z.string().max(2000).optional(),
});

export const convertToLeadSchema = z.object({
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional(),
  notes: z.string().max(2000).optional(),
});

interface RawCollab {
  id: string; user_id: string; type: string; status: string; proposal: string | null;
  reviewed_by: string | null; review_notes: string | null; converted_lead_id: string | null;
  created_at: string; updated_at: string;
}

function mapCollab(r: RawCollab) {
  return { id: r.id, userId: r.user_id, type: r.type, status: r.status, proposal: r.proposal,
    reviewedBy: r.reviewed_by, reviewNotes: r.review_notes, convertedLeadId: r.converted_lead_id,
    createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at) };
}

export async function getCollab(id: string) {
  const row = await db('collaborations').where({ id }).first<RawCollab | undefined>();
  if (!row) throw new NotFoundError('Collaboration', id);
  return mapCollab(row);
}

export async function listCollabs(pagination: PaginationQuery, userId?: string) {
  const q = db('collaborations');
  if (userId) q.where({ user_id: userId });
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const rows = await q.clone().orderBy('created_at', 'desc')
    .limit(pagination.limit).offset((pagination.page - 1) * pagination.limit)
    .select<RawCollab[]>('*');
  return { data: rows.map(mapCollab), meta: buildPaginationMeta(parseInt(String(totalRow?.count ?? 0)), pagination.page, pagination.limit) };
}

export async function createCollab(data: z.infer<typeof createCollabSchema>, actorId: string) {
  const id = uuidv4();
  await db('collaborations').insert({ id, user_id: actorId, type: data.type, status: 'pending', proposal: data.proposal ?? null, created_by: actorId });
  return getCollab(id);
}

export async function updateCollabStatus(id: string, data: z.infer<typeof updateCollabStatusSchema>, actorId: string) {
  await getCollab(id);
  await db('collaborations').where({ id }).update({ status: data.status, reviewed_by: actorId, review_notes: data.reviewNotes ?? null, updated_by: actorId, updated_at: new Date() });
  return getCollab(id);
}

export async function convertToLead(id: string, data: z.infer<typeof convertToLeadSchema>, actorId: string) {
  const collab = await getCollab(id);
  const leadId = uuidv4();
  await db.transaction(async (trx: Knex.Transaction) => {
    await trx('leads').insert({ id: leadId, user_id: collab.userId, source: 'collaboration', status: 'newLead', contact_name: data.contactName ?? null, contact_email: data.contactEmail ?? null, notes: data.notes ?? null, created_by: actorId, updated_by: actorId });
    await trx('collaborations').where({ id }).update({ converted_lead_id: leadId, updated_by: actorId, updated_at: new Date() });
  });
  return getCollab(id);
}
