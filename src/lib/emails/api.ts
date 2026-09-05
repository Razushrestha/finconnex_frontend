import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmErrorMessage, crmFetch } from "@/lib/crm/request";
import { upsertEmail } from "@/lib/emails/store";
import type {
  Email,
  EmailAttachmentMeta,
  EmailStatus,
} from "@/lib/emails/types";

export type CrmEmailQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
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

function asList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        typeof item === "string"
          ? item.trim()
          : item && typeof item === "object"
            ? pickStr(
                (item as Record<string, unknown>).email,
                (item as Record<string, unknown>).address,
              )
            : "",
      )
      .filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function workspaceEmailsPath(workspaceId: string, suffix = ""): string {
  return `/v1/workspaces/${workspaceId}/emails${suffix}`;
}

export function globalEmailsPath(suffix = ""): string {
  return `/v1/emails${suffix}`;
}

export function relatedEmailsPath(
  workspaceId: string,
  relatedType: string,
  relatedId: string,
): string {
  return `/v1/workspaces/${workspaceId}/${relatedType}/${relatedId}/emails`;
}

export function mapEmailStatus(raw: string, fallback: EmailStatus = "Draft"): EmailStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (!value) return fallback;
  if (value.includes("schedul")) return "Scheduled";
  if (value.includes("open")) return "Opened";
  if (value.includes("deliver")) return "Delivered";
  if (value.includes("bounce")) return "Bounced";
  if (value.includes("fail")) return "Failed";
  if (value.includes("sent") || value.includes("send")) return "Sent";
  if (value.includes("draft")) return "Draft";
  return fallback;
}

function apiStatus(status: EmailStatus): string {
  return status.toUpperCase().replace(/ /g, "_");
}

function isEmailRecord(row: Record<string, unknown>) {
  return Boolean(
    pickStr(row.subject, row.title, row.body, row.html, row.text) ||
      row.to ||
      row.recipients ||
      row.toAddresses ||
      row.from ||
      row.fromEmail,
  );
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
    if (rec.email && typeof rec.email === "object" && !Array.isArray(rec.email)) {
      return extractRecords(rec.email);
    }
    for (const key of [
      "items",
      "emails",
      "records",
      "rows",
      "result",
      "results",
      "content",
    ]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
    if (pickStr(rec.id, rec.uuid, rec.emailId) && isEmailRecord(rec)) {
      return [rec];
    }
  }
  return [];
}

function pickRecordId(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const rec = data as Record<string, unknown>;
  const nested =
    rec.email && typeof rec.email === "object"
      ? (rec.email as Record<string, unknown>)
      : rec.data && typeof rec.data === "object" && !Array.isArray(rec.data)
        ? (rec.data as Record<string, unknown>)
        : rec;
  return pickStr(nested.id, nested.uuid, nested.emailId, rec.id, rec.uuid);
}

function formatWhen(raw: unknown): string | undefined {
  const value = pickStr(raw);
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapAttachments(raw: unknown): EmailAttachmentMeta[] {
  return extractRecords(raw).map((row, index) => ({
    id: pickStr(row.id, row.attachmentId, row.uuid) || `ema-${index}`,
    name: pickStr(row.name, row.fileName, row.filename, row.title, "Attachment"),
    sizeLabel: pickStr(row.sizeLabel, row.size) || undefined,
  }));
}

export function normalizeCrmEmail(
  raw: Record<string, unknown>,
  index: number,
): Email {
  const related =
    raw.relatedTo && typeof raw.relatedTo === "object"
      ? (raw.relatedTo as Record<string, unknown>)
      : null;
  const fromObj =
    raw.from && typeof raw.from === "object"
      ? (raw.from as Record<string, unknown>)
      : null;
  return {
    id: pickStr(raw.id, raw.uuid, raw.emailId) || `crm-email-${index}`,
    subject: pickStr(raw.subject, raw.title, "(no subject)"),
    body: pickStr(raw.body, raw.html, raw.text, raw.content),
    from: pickStr(
      fromObj && pickStr(fromObj.email, fromObj.address),
      raw.fromEmail,
      raw.from,
      raw.sender,
    ),
    to: asList(raw.to ?? raw.recipients ?? raw.toAddresses),
    cc: asList(raw.cc).length ? asList(raw.cc) : undefined,
    bcc: asList(raw.bcc).length ? asList(raw.bcc) : undefined,
    relatedTo:
      pickStr(
        related && pickStr(related.name, related.title),
        raw.relatedName,
        raw.relatedType && raw.relatedId
          ? `${raw.relatedType}: ${raw.relatedId}`
          : "",
        typeof raw.relatedTo === "string" ? raw.relatedTo : "",
      ) || undefined,
    relatedType: pickStr(raw.relatedType, related && related.type) || undefined,
    relatedId: pickStr(raw.relatedId, related && related.id) || undefined,
    templateUsed: pickStr(raw.templateName, raw.template, raw.templateUsed) || undefined,
    status: mapEmailStatus(
      pickStr(raw.status, raw.state, raw.emailStatus, raw.deliveryStatus),
      pickStr(raw.sentAt, raw.sentDate, raw.openedAt) ? "Sent" : "Draft",
    ),
    sentDate: formatWhen(
      raw.sentAt ?? raw.sentDate ?? raw.scheduledAt ?? raw.createdAt,
    ),
    openedDate: formatWhen(raw.openedAt ?? raw.openedDate),
    attachments: mapAttachments(raw.attachments ?? raw.files),
  };
}

export function normalizeCrmEmails(data: unknown): Email[] {
  return extractRecords(data).map((row, index) => normalizeCrmEmail(row, index));
}

async function withSession<T>(
  run: (
    session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
    scoped: boolean,
  ) => Promise<T>,
): Promise<T> {
  const scoped = await ensureCrmSession();
  if (scoped) return run(scoped, true);
  const access = await ensureCrmAccess();
  if (!access) throw new Error("Sign in to manage emails");
  return run(access, false);
}

async function emailsPath(suffix: string, query = ""): Promise<string> {
  const scoped = await ensureCrmSession();
  if (scoped) {
    return `${workspaceEmailsPath(scoped.workspaceId, suffix)}${query}`;
  }
  return `${globalEmailsPath(suffix)}${query}`;
}

async function relatedWorkspaceId(): Promise<string | null> {
  const scoped = await ensureCrmSession();
  if (scoped?.workspaceId && isUuid(scoped.workspaceId)) return scoped.workspaceId;
  const env = process.env.NEXT_PUBLIC_WORKSPACE_ID?.trim();
  return env && isUuid(env) ? env : null;
}

async function crmEmailsFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (isBoundCrmSession()) {
    const scoped = await ensureCrmSession();
    if (scoped) return crmFetch<T>(scoped, path, init);
    const access = await ensureCrmAccess();
    if (!access) throw new Error("Sign in to manage emails");
    return crmFetch<T>(access, path, init);
  }
  return crmBffFetch<T>(path, init);
}

async function emailsGet(suffix: string, query = ""): Promise<unknown> {
  if (!isBoundCrmSession()) {
    return crmBffFetch(await emailsPath(suffix, query));
  }
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceEmailsPath((session as CrmSession).workspaceId, suffix)
      : globalEmailsPath(suffix);
    return crmFetch(session, `${path}${query}`);
  });
}

async function emailsMutate(suffix: string, init: RequestInit): Promise<unknown> {
  if (!isBoundCrmSession()) {
    return crmBffFetch(await emailsPath(suffix), init);
  }
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceEmailsPath((session as CrmSession).workspaceId, suffix)
      : globalEmailsPath(suffix);
    return crmFetch(session, path, init);
  });
}

async function blobFromResponse(res: Response): Promise<Blob> {
  if (!res.ok) {
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    throw new Error(crmErrorMessage(json, `Download failed (${res.status})`));
  }
  return res.blob();
}

async function emailsBlob(suffix: string): Promise<Blob> {
  if (!isBoundCrmSession()) {
    const path = await emailsPath(suffix);
    const res = await fetch(`/api/auth/crm${path.slice(3)}`, {
      credentials: "same-origin",
      headers: {
        Accept: "application/octet-stream,application/pdf,*/*",
      },
    });
    return blobFromResponse(res);
  }
  return withSession(async (session, scoped) => {
    const url = scoped
      ? workspaceEmailsPath((session as CrmSession).workspaceId, suffix)
      : globalEmailsPath(suffix);
    const res = await fetch(`${session.baseUrl}${url}`, {
      headers: {
        Accept: "application/octet-stream,application/pdf,*/*",
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    return blobFromResponse(res);
  });
}

function compactBody(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

function asEmail(data: unknown, fallback?: Partial<Email>): Email | null {
  const items = normalizeCrmEmails(data);
  const mapped =
    items[0] ??
    (data && typeof data === "object" && !Array.isArray(data)
      ? normalizeCrmEmail(data as Record<string, unknown>, 0)
      : null);
  const mappedId =
    mapped?.id && !mapped.id.startsWith("crm-email-") ? mapped.id : "";
  const id = pickStr(pickRecordId(data), mappedId, fallback?.id);
  if (!id || id.startsWith("crm-email-")) {
    return fallback?.id
      ? ({
          subject: "",
          body: "",
          from: "",
          to: [],
          status: "Draft",
          ...fallback,
          id: fallback.id,
        } as Email)
      : null;
  }
  const subject =
    mapped && mapped.subject !== "(no subject)"
      ? mapped.subject
      : fallback?.subject || mapped?.subject || "(no subject)";
  const status =
    mapped && mapped.status !== "Draft"
      ? mapped.status
      : (fallback?.status ?? mapped?.status ?? "Draft");
  return {
    subject,
    body: mapped?.body || fallback?.body || "",
    from: mapped?.from || fallback?.from || "",
    to: mapped?.to?.length ? mapped.to : fallback?.to ?? [],
    cc: mapped?.cc ?? fallback?.cc,
    bcc: mapped?.bcc ?? fallback?.bcc,
    relatedTo: mapped?.relatedTo ?? fallback?.relatedTo,
    relatedType: mapped?.relatedType ?? fallback?.relatedType,
    relatedId: mapped?.relatedId ?? fallback?.relatedId,
    templateUsed: mapped?.templateUsed ?? fallback?.templateUsed,
    status,
    sentDate: mapped?.sentDate ?? fallback?.sentDate,
    openedDate: mapped?.openedDate,
    importance: mapped?.importance ?? fallback?.importance,
    attachments: mapped?.attachments ?? fallback?.attachments,
    id,
  };
}

function fallbackFromCreate(
  input: Parameters<typeof toCreateBody>[0],
): Partial<Email> {
  return {
    subject: input.subject.trim(),
    body: input.body,
    from: input.from ?? "",
    to: [...input.to],
    cc: input.cc?.length ? [...input.cc] : undefined,
    bcc: input.bcc?.length ? [...input.bcc] : undefined,
    relatedTo: input.relatedTo,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    status: input.status ?? "Draft",
    templateUsed: input.template,
  };
}

export async function listCrmEmails(
  query: CrmEmailQuery = {},
): Promise<Email[]> {
  return normalizeCrmEmails(
    await emailsGet(
      "",
      toQuery({
        page: query.page ?? 1,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
      }),
    ),
  );
}

export async function getCrmEmail(id: string): Promise<Email | null> {
  return asEmail(await emailsGet(`/${id}`));
}

export async function listRelatedCrmEmails(
  relatedType: string,
  relatedId: string,
): Promise<Email[]> {
  const workspaceId = await relatedWorkspaceId();
  if (!workspaceId) throw new Error("Sign in to load related emails");
  return normalizeCrmEmails(
    await crmEmailsFetch(
      relatedEmailsPath(workspaceId, relatedType, relatedId),
    ),
  );
}

export function toCreateBody(input: {
  subject: string;
  body: string;
  from?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  relatedType?: string;
  relatedId?: string;
  relatedTo?: string;
  status?: EmailStatus;
  template?: string;
}): Record<string, unknown> {
  return compactBody({
    subject: input.subject.trim(),
    body: input.body,
    html: input.body,
    from: input.from,
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    relatedType: input.relatedType,
    relatedId: isUuid(input.relatedId) ? input.relatedId : undefined,
    relatedTo: input.relatedTo,
    fromEmail: input.from,
    toAddresses: input.to,
    status: input.status ? apiStatus(input.status) : "DRAFT",
    template: input.template,
  });
}

export async function createCrmEmail(
  input: Parameters<typeof toCreateBody>[0],
): Promise<Email | null> {
  const raw = await emailsMutate("", {
    method: "POST",
    body: JSON.stringify(toCreateBody(input)),
  });
  return asEmail(raw, fallbackFromCreate(input));
}

export async function updateCrmEmail(
  id: string,
  patch: Partial<Email> & { body?: string },
): Promise<Email | null> {
  const body: Record<string, unknown> = {};
  if (patch.subject != null) body.subject = patch.subject;
  if (patch.body != null) {
    body.body = patch.body;
    body.html = patch.body;
  }
  if (patch.from != null) body.from = patch.from;
  if (patch.to) body.to = patch.to;
  if (patch.cc) body.cc = patch.cc;
  if (patch.bcc) body.bcc = patch.bcc;
  if (patch.status) body.status = apiStatus(patch.status);
  if (patch.templateUsed != null) body.templateName = patch.templateUsed;
  return asEmail(
    await emailsMutate(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteCrmEmail(id: string): Promise<void> {
  await emailsMutate(`/${id}`, { method: "DELETE" });
}

export async function sendCrmEmail(
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Email | null> {
  const raw = await emailsMutate(`/${id}/send`, {
    method: "POST",
    body: JSON.stringify(extra),
  });
  return asEmail(raw, {
    id,
    status: extra.scheduled ? "Scheduled" : "Sent",
  });
}

export async function retryCrmEmail(id: string): Promise<Email | null> {
  return asEmail(
    await emailsMutate(`/${id}/retry`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function cancelCrmEmail(id: string): Promise<Email | null> {
  return asEmail(
    await emailsMutate(`/${id}/cancel`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function applyCrmEmailTemplate(
  id: string,
  extra: Record<string, unknown>,
): Promise<Email | null> {
  return asEmail(
    await emailsMutate(`/${id}/apply-template`, {
      method: "POST",
      body: JSON.stringify(extra),
    }),
  );
}

export async function attachCrmEmailObject(
  id: string,
  extra: Record<string, unknown>,
): Promise<EmailAttachmentMeta | null> {
  const data = await emailsMutate(`/${id}/attachments`, {
    method: "POST",
    body: JSON.stringify(extra),
  });
  const rows = mapAttachments(data);
  if (rows[0]) return rows[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return mapAttachments([data as Record<string, unknown>])[0] ?? null;
  }
  return null;
}

export async function deleteCrmEmailAttachment(
  id: string,
  attachmentId: string,
): Promise<void> {
  await emailsMutate(`/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export async function downloadCrmEmailAttachment(
  id: string,
  attachmentId: string,
): Promise<Blob> {
  return emailsBlob(`/${id}/attachments/${attachmentId}/download`);
}

export async function tryCrmEmail<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteEmail(email: Email | null) {
  if (email) upsertEmail(email);
  return email;
}

export function isCrmEmailId(id: string): boolean {
  return isUuid(id);
}
