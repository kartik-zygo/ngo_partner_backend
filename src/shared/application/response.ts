export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: PaginationMeta;
}

export function buildResponse<T>(data: T, meta?: PaginationMeta): ApiResponse<T> {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return { total, page, limit, hasNext: page * limit < total };
}
