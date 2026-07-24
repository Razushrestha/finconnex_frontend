/** Shared list / pagination / mutate types for all modules */

export interface PageParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface IdResponse {
  id: string;
}

/** Soft-delete response: record moved to recycle bin. */
export interface SoftDeleteResponse {
  id: string;
  recycleBinId?: string;
}

export function emptyPage<T>(page = 1, pageSize = 50): Page<T> {
  return {
    items: [],
    meta: { page, pageSize, total: 0, totalPages: 0 },
  };
}

export function paginateLocal<T>(
  items: T[],
  params: PageParams = {},
): Page<T> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(200, params.pageSize ?? 50));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    meta: { page, pageSize, total, totalPages },
  };
}
