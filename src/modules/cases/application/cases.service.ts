import { v4 as uuidv4 } from 'uuid';

import { db } from '@shared/infrastructure/database';
import { NotFoundError, ConflictError } from '@shared/domain/errors';
import { assertCaseTransition } from '@shared/domain/transitions';
import { buildPaginationMeta } from '@shared/application/response';
import type { PaginationQuery } from '@shared/application/common-schemas';
import type { CaseStatus } from '@shared/domain/constants';

import type {
  CreateCaseDto,
  UpdateCaseStatusDto,
  CreateDocumentRequestDto,
  ResubmitDocumentsDto,
} from './cases.schemas';

export interface ClientCase {
  id: string; userId: string; leadId: string | null; serviceId: string | null;
  status: string; notes: string | null; rejectionReason: string | null;
  version: number; createdAt: Date; updatedAt: Date;
}

interface RawCase {
  id: string; user_id: string; lead_id: string | null; service_id: string | null;
  status: string; notes: string | null; rejection_reason: string | null;
  version: number; created_at: string; updated_at: string;
}

function mapCase(r: RawCase): ClientCase {
  return { id: r.id, userId: r.user_id, leadId: r.lead_id, serviceId: r.service_id,
    status: r.status, notes: r.notes, rejectionReason: r.rejection_reason,
    version: r.version, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at) };
}

export async function getCase(id: string): Promise<ClientCase> {
  const row = await db('client_cases').where({ id }).whereNull('deleted_at').first<RawCase | undefined>();
  if (!row) throw new NotFoundError('Case', id);
  return mapCase(row);
}

export async function listCases(
  pagination: PaginationQuery,
  filters: { userId?: string; status?: string },
): Promise<{ data: ClientCase[]; meta: ReturnType<typeof buildPaginationMeta> }> {
  const q = db('client_cases').whereNull('deleted_at');
  if (filters.userId) q.where({ user_id: filters.userId });
  if (filters.status) q.where({ status: filters.status });
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const rows = await q.clone().orderBy('created_at', 'desc')
    .limit(pagination.limit).offset((pagination.page - 1) * pagination.limit)
    .select<RawCase[]>('*');
  return { data: rows.map(mapCase), meta: buildPaginationMeta(parseInt(String(totalRow?.count ?? 0)), pagination.page, pagination.limit) };
}

export async function createCase(data: CreateCaseDto, actorId: string): Promise<ClientCase> {
  const id = uuidv4();
  await db('client_cases').insert({
    id, user_id: data.userId, lead_id: data.leadId ?? null,
    service_id: data.serviceId ?? null, status: 'submitted',
    notes: data.notes ?? null, created_by: actorId, updated_by: actorId,
  });
  return getCase(id);
}

export async function updateCaseStatus(
  id: string, data: UpdateCaseStatusDto, actorId: string,
): Promise<ClientCase> {
  const c = await getCase(id);
  assertCaseTransition(c.status as CaseStatus, data.status as CaseStatus);
  const affected = await db('client_cases')
    .where({ id, version: c.version }).whereNull('deleted_at')
    .update({
      status: data.status,
      rejection_reason: data.rejectionReason ?? null,
      version: c.version + 1,
      updated_by: actorId,
      updated_at: new Date(),
    });
  if (!affected) throw new ConflictError('Case was modified concurrently.');
  return getCase(id);
}

export async function createDocumentRequest(
  caseId: string, data: CreateDocumentRequestDto, actorId: string,
): Promise<unknown> {
  await getCase(caseId);
  const lastRound = await db('case_document_requests')
    .where({ case_id: caseId }).max<{ max: number }>('round as max').first();
  const round = data.round ?? ((lastRound?.max ?? 0) + 1);

  const id = uuidv4();
  await db('case_document_requests').insert({
    id, case_id: caseId, round, required_documents: JSON.stringify(data.requiredDocuments),
    message: data.message ?? null,
    due_date: data.dueDate ? new Date(data.dueDate) : null,
    created_by: actorId,
  });
  return db('case_document_requests').where({ id }).first();
}

export async function resubmitDocuments(
  caseId: string, data: ResubmitDocumentsDto, actorId: string,
): Promise<void> {
  await getCase(caseId);
  const inserts = data.documents.map((doc) => ({
    id: uuidv4(),
    case_id: caseId,
    request_id: data.requestId,
    document_name: doc.documentName,
    file_url: doc.fileUrl,
    mime_type: doc.mimeType ?? null,
    file_size_bytes: doc.fileSizeBytes ?? null,
    uploaded_by: actorId,
  }));
  await db('case_documents').insert(inserts);
  await db('case_document_requests').where({ id: data.requestId }).update({ is_fulfilled: true });
}

export async function uploadDocument(
  caseId: string,
  doc: { documentName: string; fileUrl: string; mimeType?: string; fileSizeBytes?: number },
  actorId: string,
): Promise<unknown> {
  await getCase(caseId);
  const id = uuidv4();
  await db('case_documents').insert({
    id, case_id: caseId, request_id: null,
    document_name: doc.documentName, file_url: doc.fileUrl,
    mime_type: doc.mimeType ?? null, file_size_bytes: doc.fileSizeBytes ?? null,
    uploaded_by: actorId,
  });
  return db('case_documents').where({ id }).first();
}
