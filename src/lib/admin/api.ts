import { ensureCrmAccess } from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";

export type AdminWorkspace = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminWorkspacePage = {
  items: AdminWorkspace[];
  total: number;
  page: number;
  limit: number;
};

type Paginated<T> = {
  items?: T[];
  metadata?: {
    currentPage?: number;
    itemsPerPage?: number;
    totalItems?: number;
  };
};

function asWorkspaces(data: unknown): AdminWorkspace[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return data[0] as AdminWorkspace[];
    }
    return data as AdminWorkspace[];
  }
  if (typeof data === "object" && data !== null && "items" in data) {
    const items = (data as Paginated<AdminWorkspace>).items;
    return Array.isArray(items) ? items : [];
  }
  return [];
}

function asTotal(data: unknown, fallback: number): number {
  if (Array.isArray(data) && data.length === 2 && typeof data[1] === "number") {
    return data[1];
  }
  if (data && typeof data === "object" && "metadata" in data) {
    const total = (data as Paginated<AdminWorkspace>).metadata?.totalItems;
    if (typeof total === "number") return total;
  }
  return fallback;
}

export async function listAdminWorkspaces(
  query: {
    page?: number;
    limit?: number;
    search?: string;
  } = {},
): Promise<AdminWorkspacePage> {
  const auth = await ensureCrmAccess();
  if (!auth) {
    throw new Error("Sign in to load workspaces");
  }

  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 20));
  if (query.search?.trim()) params.set("search", query.search.trim());

  const data = await crmFetch<unknown>(
    auth,
    `/v1/admin/workspaces?${params.toString()}`,
  );
  const items = asWorkspaces(data);
  return {
    items,
    total: asTotal(data, items.length),
    page: query.page ?? 1,
    limit: query.limit ?? 20,
  };
}

export async function deleteAdminUser(id: string): Promise<void> {
  const auth = await ensureCrmAccess();
  if (!auth) {
    throw new Error("Sign in to delete this user");
  }
  await crmFetch<unknown>(auth, `/v1/admin/user/${id}`, { method: "DELETE" });
}
