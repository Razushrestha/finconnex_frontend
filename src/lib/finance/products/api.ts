import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import { formatFinanceDate } from "@/lib/finance/shared";
import {
  type FinanceProduct,
  type ProductStatus,
  type ProductType,
  upsertProduct,
} from "@/lib/finance/products/types";

export type CrmProductQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toNum(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function productsPath(suffix = ""): string {
  return `/v1/products${suffix}`;
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return (data[0] as unknown[]).filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      );
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of ["items", "products", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function mapProductType(raw: string): ProductType {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("product") || value.includes("item") || value.includes("goods")) {
    return "Product";
  }
  return "Service";
}

export function apiProductType(type: ProductType): string {
  return type === "Product" ? "PRODUCT" : "SERVICE";
}

export function mapProductStatus(raw: string): ProductStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("inactive") || value.includes("disable") || value.includes("archived")) {
    return "Inactive";
  }
  return "Active";
}

export function apiProductStatus(status: ProductStatus): string {
  return status === "Inactive" ? "INACTIVE" : "ACTIVE";
}

function formatDate(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return formatFinanceDate();
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value.trim())) return value.trim();
    return value;
  }
  const d = new Date(parsed);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function normalizeProduct(
  raw: Record<string, unknown>,
  index: number,
): FinanceProduct {
  const id = pickStr(raw.id, raw.productId, raw.uuid) || `crm-prod-${index}`;
  const sku = pickStr(raw.sku, raw.code, raw.itemCode, raw.productCode) || `SKU-${index + 100}`;
  const name = pickStr(raw.name, raw.title, raw.label, "Item");
  const type = mapProductType(pickStr(raw.type, raw.itemType, raw.category, "Service"));
  const status = mapProductStatus(pickStr(raw.status, raw.state, "Active"));
  const description = pickStr(raw.description, raw.notes, raw.details) || undefined;
  const unitPrice = toNum(raw.unitPrice ?? raw.price ?? raw.rate ?? raw.cost, 0);
  const taxRate = toNum(raw.taxRate ?? raw.taxPercent ?? raw.tax, 10);
  const unit = pickStr(raw.unit, raw.unitOfMeasure, raw.uom, "unit");
  const createdBy = pickStr(
    raw.createdBy,
    raw.createdByName,
    raw.userName,
    raw.owner,
    "John Smith",
  );
  const createdAt = formatDate(raw.createdAt ?? raw.insertedAt);

  return {
    id,
    sku,
    name,
    type,
    status,
    description,
    unitPrice,
    taxRate,
    unit,
    createdBy,
    createdAt,
  };
}

export function normalizeProducts(data: unknown): FinanceProduct[] {
  return extractRecords(data).map((row, index) =>
    normalizeProduct(row, index),
  );
}

export function toCreateProductBody(input: {
  sku?: string;
  name: string;
  type?: ProductType;
  status?: ProductStatus;
  description?: string;
  unitPrice?: number;
  taxRate?: number;
  unit?: string;
  createdBy?: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
  };
  if (input.sku?.trim()) body.sku = input.sku.trim();
  if (input.type) body.type = apiProductType(input.type);
  if (input.status) body.status = apiProductStatus(input.status);
  if (input.description?.trim()) body.description = input.description.trim();
  if (typeof input.unitPrice === "number") {
    body.unitPrice = input.unitPrice;
    body.price = input.unitPrice;
  }
  if (typeof input.taxRate === "number") body.taxRate = input.taxRate;
  if (input.unit?.trim()) body.unit = input.unit.trim();
  if (input.createdBy?.trim()) body.createdBy = input.createdBy.trim();
  return body;
}

export function toUpdateProductBody(
  patch: Partial<FinanceProduct>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.name?.trim()) body.name = patch.name.trim();
  if (patch.sku?.trim()) body.sku = patch.sku.trim();
  if (patch.type) body.type = apiProductType(patch.type);
  if (patch.status) body.status = apiProductStatus(patch.status);
  if (patch.description !== undefined) body.description = patch.description?.trim() || "";
  if (typeof patch.unitPrice === "number") {
    body.unitPrice = patch.unitPrice;
    body.price = patch.unitPrice;
  }
  if (typeof patch.taxRate === "number") body.taxRate = patch.taxRate;
  if (patch.unit?.trim()) body.unit = patch.unit.trim();
  return body;
}

async function productsRequest(
  suffix: string,
  init?: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage products");
  return crmFetch(auth, productsPath(suffix), init);
}

function asProduct(data: unknown): FinanceProduct | null {
  const items = normalizeProducts(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeProduct(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmProducts(
  query: CrmProductQuery = {},
): Promise<FinanceProduct[]> {
  return normalizeProducts(
    await productsRequest(
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
        type: query.type,
      }),
    ),
  );
}

export async function getCrmProduct(id: string): Promise<FinanceProduct | null> {
  return asProduct(await productsRequest(`/${id}`));
}

export async function createCrmProduct(
  body: Record<string, unknown>,
): Promise<FinanceProduct | null> {
  return asProduct(
    await productsRequest("", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCrmProduct(
  id: string,
  patch: Record<string, unknown>,
): Promise<FinanceProduct | null> {
  return asProduct(
    await productsRequest(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmProduct(id: string): Promise<void> {
  await productsRequest(`/${id}`, { method: "DELETE" });
}

export async function tryCrmProduct<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteProduct(row: FinanceProduct | null): FinanceProduct | null {
  if (row) upsertProduct(row);
  return row;
}

export function isCrmProductId(id: string): boolean {
  return isUuid(id);
}
