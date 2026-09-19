import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";

export type CrmTemplateType = "EMAIL" | "SMS" | "MESSAGE" | "VOICE";

export type CrmTemplate = {
  id: string;
  name: string;
  templateType: CrmTemplateType;
  subject?: string;
  body: string;
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
    const rec = data as { items?: unknown; templates?: unknown };
    if (Array.isArray(rec.items)) return extractRecords(rec.items);
    if (Array.isArray(rec.templates)) return extractRecords(rec.templates);
  }
  return [];
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

function mapTemplate(raw: Record<string, unknown>): CrmTemplate {
  const type = pickStr(raw.templateType, "EMAIL").toUpperCase() as CrmTemplateType;
  return {
    id: pickStr(raw.id),
    name: pickStr(raw.name, "Untitled template"),
    templateType: type,
    subject: pickStr(raw.subject) || undefined,
    body: pickStr(raw.body, ""),
  };
}

export async function listCrmTemplates(
  templateType?: CrmTemplateType,
): Promise<CrmTemplate[]> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load templates");
  const q = new URLSearchParams({ limit: "100" });
  if (templateType) q.set("templateType", templateType);
  const data = await crmFetch(auth, `/v1/templates?${q}`);
  return extractRecords(data).map(mapTemplate).filter((row) => row.id);
}

export async function createCrmTemplate(input: {
  name: string;
  templateType: CrmTemplateType;
  subject?: string;
  body: string;
}): Promise<CrmTemplate> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to create a template");
  const data = await crmFetch(auth, "/v1/templates", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      templateType: input.templateType,
      subject: input.subject,
      body: input.body,
      isActive: true,
    }),
  });
  const row =
    data && typeof data === "object" && !Array.isArray(data)
      ? mapTemplate(data as Record<string, unknown>)
      : extractRecords(data).map(mapTemplate)[0];
  if (!row?.id) throw new Error("Template was not created");
  return row;
}

export async function ensureCrmEmailTemplate(input: {
  name: string;
  subject: string;
  body: string;
}): Promise<CrmTemplate> {
  const existing = await listCrmTemplates("EMAIL");
  const match = existing.find(
    (row) => row.name.toLowerCase() === input.name.trim().toLowerCase(),
  );
  if (match) return match;
  if (existing[0]) return existing[0];
  return createCrmTemplate({
    name: input.name.trim() || "Campaign email",
    templateType: "EMAIL",
    subject: input.subject,
    body: input.body || "<p>Hello</p>",
  });
}
