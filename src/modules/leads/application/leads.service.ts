import { v4 as uuidv4 } from 'uuid';
import type { Knex } from 'knex';

import { db } from '@shared/infrastructure/database';
import { NotFoundError, ConflictError } from '@shared/domain/errors';
import { assertLeadTransition } from '@shared/domain/transitions';
import { buildPaginationMeta } from '@shared/application/response';

import type { CreateLeadDto, UpdateLeadStatusDto, AssignLeadDto, ListLeadsQuery } from './leads.schemas';
import type { LeadStatus } from '@shared/domain/constants';

export interface Lead {
  id: string;
  userId: string | null;
  serviceId: string | null;
  source: string;
  status: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface RawLead {
  id: string; user_id: string | null; service_id: string | null; source: string;
  status: string; contact_name: string | null; contact_email: string | null;
  contact_phone: string | null; notes: string | null; version: number;
  created_at: string; updated_at: string; deleted_at: string | null;
}

function mapLead(r: RawLead): Lead {
  return {
    id: r.id, userId: r.user_id, serviceId: r.service_id, source: r.source,
    status: r.status, contactName: r.contact_name, contactEmail: r.contact_email,
    contactPhone: r.contact_phone, notes: r.notes, version: r.version,
    createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
    deletedAt: r.deleted_at ? new Date(r.deleted_at) : null,
  };
}

export async function getLead(id: string): Promise<Lead> {
  const row = await db('leads').where({ id }).whereNull('deleted_at').first<RawLead | undefined>();
  if (!row) throw new NotFoundError('Lead', id);
  return mapLead(row);
}

export async function listLeads(query: ListLeadsQuery): Promise<{ data: Lead[]; meta: ReturnType<typeof buildPaginationMeta> }> {
  const q = db('leads').whereNull('deleted_at');
  if (query.userId) q.where({ user_id: query.userId });
  if (query.status) q.where({ status: query.status });
  if (query.source) q.where({ source: query.source });
  if (query.assignedTo) {
    q.whereIn('id', db('lead_assignments_history').where({ assigned_to: query.assignedTo, is_current: true }).select('lead_id'));
  }
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const total = parseInt(String(totalRow?.count ?? 0));
  const rows = await q.clone()
    .orderBy(query.sortBy ?? 'created_at', query.sortOrder)
    .limit(query.limit)
    .offset((query.page - 1) * query.limit)
    .select<RawLead[]>('*');
  return { data: rows.map(mapLead), meta: buildPaginationMeta(total, query.page, query.limit) };
}

export async function createLead(data: CreateLeadDto, actorId: string): Promise<Lead> {
  const id = uuidv4();
  await db('leads').insert({
    id,
    user_id: data.userId ?? null,
    service_id: data.serviceId ?? null,
    source: data.source,
    status: 'newLead',
    contact_name: data.contactName ?? null,
    contact_email: data.contactEmail ?? null,
    contact_phone: data.contactPhone ?? null,
    notes: data.notes ?? null,
    created_by: actorId,
    updated_by: actorId,
  });
  await recordActivity(id, actorId, 'LEAD_CREATED', { source: data.source });
  return getLead(id);
}

export async function updateLeadStatus(
  id: string,
  data: UpdateLeadStatusDto,
  actorId: string,
): Promise<Lead> {
  const lead = await getLead(id);
  assertLeadTransition(lead.status as LeadStatus, data.status as LeadStatus);

  const affected = await db('leads')
    .where({ id, version: lead.version })
    .whereNull('deleted_at')
    .update({ status: data.status, version: lead.version + 1, updated_by: actorId, updated_at: new Date() });

  if (!affected) throw new ConflictError('Lead was modified concurrently. Please retry.');
  await recordActivity(id, actorId, 'STATUS_CHANGED', { from: lead.status, to: data.status, reason: data.reason });
  return getLead(id);
}

export async function addNote(leadId: string, content: string, actorId: string): Promise<void> {
  await getLead(leadId); // throws if not found
  await db('lead_notes').insert({ id: uuidv4(), lead_id: leadId, created_by: actorId, content });
  await recordActivity(leadId, actorId, 'NOTE_ADDED', {});
}

export async function assignLead(
  leadId: string,
  data: AssignLeadDto,
  actorId: string,
): Promise<Lead> {
  const lead = await getLead(leadId);

  return db.transaction(async (trx: Knex.Transaction) => {
    // Mark previous assignment as no longer current
    await trx('lead_assignments_history')
      .where({ lead_id: leadId, is_current: true })
      .update({ is_current: false, unassigned_at: new Date() });

    // Insert new assignment
    await trx('lead_assignments_history').insert({
      id: uuidv4(),
      lead_id: leadId,
      assigned_to: data.assignedTo,
      assigned_by: actorId,
      assigned_at: new Date(),
      is_current: true,
    });

    await trx('lead_activity').insert({
      id: uuidv4(),
      lead_id: leadId,
      actor_id: actorId,
      activity_type: 'ASSIGNED',
      payload: JSON.stringify({ assignedTo: data.assignedTo }),
    });

    return lead;
  });
}

export async function softDeleteLead(id: string, actorId: string): Promise<void> {
  await getLead(id);
  await db('leads').where({ id }).update({ deleted_at: new Date(), updated_by: actorId });
}

export async function getLeadNotes(leadId: string): Promise<unknown[]> {
  return db('lead_notes').where({ lead_id: leadId }).orderBy('created_at', 'desc').select('*');
}

export async function getLeadActivity(leadId: string): Promise<unknown[]> {
  return db('lead_activity').where({ lead_id: leadId }).orderBy('created_at', 'desc').select('*');
}

async function recordActivity(
  leadId: string,
  actorId: string,
  activityType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await db('lead_activity').insert({
    id: uuidv4(),
    lead_id: leadId,
    actor_id: actorId,
    activity_type: activityType,
    payload: JSON.stringify(payload),
  });
}
