import { v4 as uuidv4 } from 'uuid';

import { db } from '@shared/infrastructure/database';
import { NotFoundError, ConflictError } from '@shared/domain/errors';
import { buildPaginationMeta } from '@shared/application/response';
import type { ListServicesQuery } from './services.schemas';

export interface ServiceRecord {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  basePrice: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RawService {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  base_price: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapService(r: RawService): ServiceRecord {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    basePrice: r.base_price ? parseFloat(r.base_price) : null,
    isActive: r.is_active,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export async function listServices(
  query: ListServicesQuery,
  isAdmin = false,
): Promise<{ data: ServiceRecord[]; meta: ReturnType<typeof buildPaginationMeta> }> {
  const q = db('services').whereNull('deleted_at');

  // Non-admins only see active services; admins can request inactive ones too
  if (!isAdmin || !query.includeInactive) {
    q.where({ is_active: true });
  }

  if (query.category) {
    q.where('category', query.category);
  }

  if (query.search) {
    const term = `%${query.search.toLowerCase()}%`;
    q.whereRaw('(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)', [term, term]);
  }

  const total = await q.clone().count<{ count: string }[]>('id as count').first();
  const rows = await q
    .clone()
    .orderBy('created_at', 'desc')
    .limit(query.limit)
    .offset((query.page - 1) * query.limit)
    .select<RawService[]>('*');

  return {
    data: rows.map(mapService),
    meta: buildPaginationMeta(parseInt(String(total?.count ?? 0)), query.page, query.limit),
  };
}

export async function getServiceById(id: string): Promise<ServiceRecord> {
  const row = await db('services').where({ id }).whereNull('deleted_at').first<RawService | undefined>();
  if (!row) throw new NotFoundError('Service', id);
  return mapService(row);
}

export async function createService(
  data: { name: string; description?: string; category?: string; basePrice?: number },
  actorId: string,
): Promise<ServiceRecord> {
  const id = uuidv4();
  await db('services').insert({
    id,
    name: data.name,
    description: data.description ?? null,
    category: data.category ?? null,
    base_price: data.basePrice ?? null,
    is_active: true,
    created_by: actorId,
    updated_by: actorId,
  });
  return getServiceById(id);
}

export async function updateService(
  id: string,
  data: { name?: string; description?: string; category?: string; basePrice?: number },
  actorId: string,
): Promise<ServiceRecord> {
  await getServiceById(id); // throws if not found / deleted
  await db('services').where({ id }).update({
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.category !== undefined && { category: data.category }),
    ...(data.basePrice !== undefined && { base_price: data.basePrice }),
    updated_by: actorId,
    updated_at: new Date(),
  });
  return getServiceById(id);
}

export async function toggleService(id: string, actorId: string): Promise<ServiceRecord> {
  const svc = await getServiceById(id);
  await db('services').where({ id }).update({
    is_active: !svc.isActive,
    updated_by: actorId,
    updated_at: new Date(),
  });
  return getServiceById(id);
}

export async function deleteService(id: string, actorId: string): Promise<void> {
  await getServiceById(id); // throws if already deleted

  // Prevent deleting a service that has pending/paid orders
  const activeOrder = await db('service_orders')
    .where({ service_id: id })
    .whereIn('status', ['pending', 'paid'])
    .first<{ id: string } | undefined>('id');

  if (activeOrder) {
    throw new ConflictError(
      'Cannot delete a service that has active or paid orders. Deactivate it instead.',
    );
  }

  await db('services').where({ id }).update({
    deleted_at: new Date(),
    updated_by: actorId,
    updated_at: new Date(),
  });
}

export async function listCategories(): Promise<string[]> {
  const rows = await db('services')
    .whereNull('deleted_at')
    .whereNotNull('category')
    .distinct('category')
    .orderBy('category')
    .pluck<string[]>('category');
  return rows;
}
