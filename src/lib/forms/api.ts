import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type {
  FormDestination,
  FormFieldDef,
  FormFieldType,
  FormStatus,
  MarketingForm,
} from "@/lib/marketing/forms/types";
import { formatFormAt } from "@/lib/marketing/forms/types";

export type CrmFormQuery = {
  page?: number;
  limit?: number;
  status?: string;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
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
    const rec = data as { items?: unknown; forms?: unknown };
    if (Array.isArray(rec.items)) return extractRecords(rec.items);
    if (Array.isArray(rec.forms)) return extractRecords(rec.forms);
  }
  return [];
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

function formsPath(suffix = ""): string {
  return `/v1/forms${suffix}`;
}

async function formsGet(suffix: string): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load forms");
  return crmFetch(auth, formsPath(suffix));
}

async function formsMutate(suffix: string, init: RequestInit): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage forms");
  return crmFetch(auth, formsPath(suffix), init);
}

function mapStatus(raw: string): FormStatus {
  const value = raw.toUpperCase();
  if (value === "PUBLISHED") return "Published";
  if (value === "ARCHIVED") return "Archived";
  return "Draft";
}

function mapDestination(raw: string): FormDestination {
  const value = raw.toUpperCase();
  if (value === "CONTACT") return "Contact";
  if (value === "TICKET") return "Ticket";
  return "Lead";
}

function toNestDestination(dest: FormDestination): string {
  switch (dest) {
    case "Contact":
      return "CONTACT";
    case "Ticket":
      return "TICKET";
    default:
      return "LEAD";
  }
}

function mapFieldType(raw: string): FormFieldType {
  const value = raw.toUpperCase();
  if (value === "EMAIL") return "Email";
  if (value === "PHONE") return "Phone";
  if (value === "TEXTAREA") return "Textarea";
  if (value === "SELECT" || value === "CHECKBOX") return "Select";
  return "Text";
}

function toNestFieldType(type: FormFieldType): string {
  switch (type) {
    case "Email":
      return "EMAIL";
    case "Phone":
      return "PHONE";
    case "Textarea":
      return "TEXTAREA";
    case "Select":
      return "SELECT";
    case "File":
      return "TEXT";
    default:
      return "TEXT";
  }
}

function slugifyKey(label: string, index: number): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || `field_${index + 1}`;
  return base;
}

function mapFields(raw: unknown): FormFieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row, index) => ({
      id: pickStr(row.key, row.id, `f${index}`),
      label: pickStr(row.label, `Field ${index + 1}`),
      type: mapFieldType(pickStr(row.type, "TEXT")),
      required: Boolean(row.required),
      options: Array.isArray(row.options)
        ? row.options.filter((o): o is string => typeof o === "string")
        : undefined,
    }));
}

export function normalizeMarketingForm(
  raw: Record<string, unknown>,
  index: number,
): MarketingForm {
  const id = pickStr(raw.id) || `crm-form-${index}`;
  const fieldDefs = mapFields(raw.fields);
  const slug = pickStr(raw.slug, `form-${index}`);
  return {
    id,
    formId: pickStr(raw.formCode, raw.code, `FR-${index + 1}`),
    name: pickStr(raw.name, "Untitled form"),
    status: mapStatus(pickStr(raw.status, "DRAFT")),
    submissions: 0,
    fields: fieldDefs.length,
    fieldDefs,
    destination: mapDestination(pickStr(raw.destination, "LEAD")),
    createdBy: pickStr(raw.createdByName, raw.createdById, "—"),
    updatedAt: pickStr(raw.updatedAt, raw.createdAt, formatFormAt()),
    embedSlug: slug,
    description: pickStr(raw.description) || undefined,
    thankYouMessage: pickStr(raw.confirmationMessage) || undefined,
  };
}

function asFormRow(data: unknown): Record<string, unknown> | null {
  const rows = extractRecords(data);
  if (rows[0]) return rows[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

export async function listCrmForms(
  query: CrmFormQuery = {},
): Promise<MarketingForm[]> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 100));
  if (query.status) params.set("status", query.status);
  const data = await formsGet(`?${params}`);
  return extractRecords(data).map((row, i) => normalizeMarketingForm(row, i));
}

export async function getCrmForm(id: string): Promise<MarketingForm | null> {
  const data = await formsGet(`/${id}`);
  const row = asFormRow(data);
  return row ? normalizeMarketingForm(row, 0) : null;
}

export async function createCrmForm(input: {
  name: string;
  slug: string;
  destination: FormDestination;
  fieldDefs: FormFieldDef[];
  thankYouMessage?: string;
}): Promise<MarketingForm> {
  const fields = input.fieldDefs.map((field, index) => ({
    key: slugifyKey(field.label, index),
    label: field.label.trim(),
    type: toNestFieldType(field.type),
    required: field.required,
    options: field.options?.length ? field.options : undefined,
  }));
  const data = await formsMutate("", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      slug: input.slug,
      destination: toNestDestination(input.destination),
      fields,
      confirmationMessage: input.thankYouMessage || undefined,
    }),
  });
  const row = asFormRow(data);
  if (!row) throw new Error("Form was not created");
  return normalizeMarketingForm(row, 0);
}

export async function updateCrmForm(
  id: string,
  patch: Record<string, unknown>,
): Promise<MarketingForm | null> {
  const data = await formsMutate(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const row = asFormRow(data);
  return row ? normalizeMarketingForm(row, 0) : null;
}

export async function publishCrmForm(id: string): Promise<MarketingForm | null> {
  const data = await formsMutate(`/${id}/publish`, {
    method: "POST",
    body: "{}",
  });
  const row = asFormRow(data);
  return row ? normalizeMarketingForm(row, 0) : null;
}

export async function pauseCrmForm(id: string): Promise<MarketingForm | null> {
  const data = await formsMutate(`/${id}/pause`, {
    method: "POST",
    body: "{}",
  });
  const row = asFormRow(data);
  return row ? normalizeMarketingForm(row, 0) : null;
}

export async function archiveCrmForm(id: string): Promise<void> {
  await formsMutate(`/${id}/archive`, { method: "POST", body: "{}" });
}

export async function submitPublicCrmForm(
  slug: string,
  values: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`/api/auth/crm/public/forms/${encodeURIComponent(slug)}/submit`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    throw new Error(
      typeof json === "object" &&
        json &&
        "message" in json &&
        typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : `Form submit failed (${res.status})`,
    );
  }
  return json;
}

export async function tryCrmForm<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
