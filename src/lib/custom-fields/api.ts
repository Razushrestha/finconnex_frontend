import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type {
  CustomFieldDef,
  CustomFieldEntity,
  CustomFieldType,
} from "@/lib/custom-fields/types";

export type CrmCustomFieldQuery = {
  page?: number;
  limit?: number;
  search?: string;
  entity?: string;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
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

export function customFieldsPath(suffix = ""): string {
  return `/v1/custom-fields${suffix}`;
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
    for (const key of [
      "items",
      "customFields",
      "definitions",
      "fields",
      "records",
      "rows",
      "result",
    ]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

async function customFieldsGet(suffix: string, query = ""): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load custom fields");
  return crmFetch(auth, `${customFieldsPath(suffix)}${query}`);
}

async function customFieldsMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage custom fields");
  return crmFetch(auth, customFieldsPath(suffix), init);
}

export function mapCustomFieldEntity(raw: string): CustomFieldEntity {
  const value = raw.toLowerCase();
  if (value.includes("contact")) return "Contact";
  if (value.includes("deal") || value.includes("opportunit")) return "Deal";
  return "Lead";
}

export function mapCustomFieldType(raw: string): CustomFieldType {
  const value = raw.toLowerCase();
  if (value.includes("num") || value.includes("int") || value.includes("decimal")) {
    return "number";
  }
  if (value.includes("select") || value.includes("pick") || value.includes("enum")) {
    return "select";
  }
  if (value.includes("date") || value.includes("time")) return "date";
  return "text";
}

function asOptions(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const opts = raw
      .map((item) =>
        typeof item === "string"
          ? item.trim()
          : item && typeof item === "object"
            ? pickStr(
                (item as Record<string, unknown>).label,
                (item as Record<string, unknown>).value,
                (item as Record<string, unknown>).name,
              )
            : "",
      )
      .filter(Boolean);
    return opts.length ? opts : undefined;
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

export function normalizeCustomField(
  raw: Record<string, unknown>,
  index: number,
): CustomFieldDef {
  const key =
    pickStr(raw.key, raw.apiName, raw.slug, raw.name, raw.internalName) ||
    `field${index + 1}`;
  const activeRaw = raw.active ?? raw.isActive ?? raw.enabled;
  return {
    id: pickStr(raw.id, raw.uuid, raw.customFieldId) || `crm-cf-${index}`,
    entity: mapCustomFieldEntity(
      pickStr(raw.entity, raw.entityType, raw.objectType, raw.relatedType, "LEAD"),
    ),
    key: key.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40) || `field${index + 1}`,
    label: pickStr(raw.label, raw.name, raw.displayName, raw.title, key),
    type: mapCustomFieldType(
      pickStr(raw.type, raw.fieldType, raw.dataType, raw.kind, "TEXT"),
    ),
    options: asOptions(raw.options ?? raw.choices ?? raw.values),
    active: activeRaw === false || activeRaw === "false" ? false : true,
  };
}

export function normalizeCustomFields(data: unknown): CustomFieldDef[] {
  return extractRecords(data).map((row, index) =>
    normalizeCustomField(row, index),
  );
}

function asField(data: unknown): CustomFieldDef | null {
  const items = normalizeCustomFields(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeCustomField(data as Record<string, unknown>, 0);
  }
  return null;
}

export function toCustomFieldBody(input: CustomFieldDef): Record<string, unknown> {
  const entity = input.entity.toUpperCase();
  const type = input.type.toUpperCase();
  return {
    name: input.label,
    label: input.label,
    displayName: input.label,
    key: input.key,
    apiName: input.key,
    slug: input.key,
    entity,
    entityType: entity,
    objectType: entity,
    relatedType: entity,
    type,
    fieldType: type,
    dataType: type,
    options: input.options,
    choices: input.options,
    active: input.active,
    isActive: input.active,
    required: false,
  };
}

export async function listCrmCustomFields(
  query: CrmCustomFieldQuery = {},
): Promise<CustomFieldDef[]> {
  return normalizeCustomFields(
    await customFieldsGet(
      "",
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        entity: query.entity,
      }),
    ),
  );
}

export async function getCrmCustomField(id: string): Promise<CustomFieldDef | null> {
  return asField(await customFieldsGet(`/${id}`));
}

export async function createCrmCustomField(
  body: Record<string, unknown>,
): Promise<CustomFieldDef | null> {
  return asField(
    await customFieldsMutate("", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCrmCustomField(
  id: string,
  patch: Record<string, unknown>,
): Promise<CustomFieldDef | null> {
  return asField(
    await customFieldsMutate(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmCustomField(id: string): Promise<void> {
  await customFieldsMutate(`/${id}`, { method: "DELETE" });
}

export async function restoreCrmCustomField(
  id: string,
): Promise<CustomFieldDef | null> {
  return asField(
    await customFieldsMutate(`/${id}/restore`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function listCrmCustomFieldValues(
  entityId: string,
): Promise<Record<string, string>> {
  const data = await customFieldsGet(`/values/${entityId}`);
  const rows = extractRecords(data);
  const out: Record<string, string> = {};
  if (rows.length) {
    for (const row of rows) {
      const key = pickStr(row.key, row.apiName, row.fieldKey, row.id);
      const value = pickStr(row.value, row.text, row.raw);
      if (key) out[key] = value;
    }
    return out;
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const rec = data as Record<string, unknown>;
    if (rec.values && typeof rec.values === "object" && !Array.isArray(rec.values)) {
      for (const [key, value] of Object.entries(rec.values as Record<string, unknown>)) {
        if (value != null) out[key] = String(value);
      }
    }
  }
  return out;
}

export async function setCrmCustomFieldValue(
  id: string,
  body: { entityId: string; value: unknown },
): Promise<unknown> {
  return customFieldsMutate(`/${id}/values`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function clearCrmCustomFieldValue(
  id: string,
  entityId: string,
): Promise<void> {
  await customFieldsMutate(`/${id}/values/${entityId}`, { method: "DELETE" });
}

export async function exportCrmCustomFieldDefinitions(): Promise<unknown> {
  return customFieldsGet("/definitions/export");
}

export async function getCrmCustomFieldUsage(id: string): Promise<unknown> {
  return customFieldsGet(`/${id}/usage`);
}

export async function searchCrmCustomFieldValues(
  id: string,
  query: string,
): Promise<string[]> {
  const data = await customFieldsGet(
    `/${id}/value-search`,
    toQuery({ q: query, search: query, value: query }),
  );
  if (Array.isArray(data) && data.every((item) => typeof item === "string")) {
    return data as string[];
  }
  return extractRecords(data)
    .map((row) => pickStr(row.id, row.entityId, row.recordId))
    .filter(Boolean);
}

export async function previewCrmCustomField(
  body: Record<string, unknown>,
): Promise<unknown> {
  return customFieldsMutate("/preview", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function reorderCrmCustomFields(
  ids: string[],
): Promise<unknown> {
  return customFieldsMutate("/reorder", {
    method: "POST",
    body: JSON.stringify({
      ids,
      items: ids.map((id, order) => ({ id, order })),
    }),
  });
}

export async function importCrmCustomFields(
  body: Record<string, unknown>,
): Promise<unknown> {
  return customFieldsMutate("/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function bulkCrmCustomFieldValues(
  values: Array<{ customFieldId: string; entityId: string; value: unknown }>,
): Promise<unknown> {
  return customFieldsMutate("/values/bulk", {
    method: "POST",
    body: JSON.stringify({ values, items: values }),
  });
}

export async function tryCrmCustomField<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
