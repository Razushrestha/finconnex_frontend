import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmErrorMessage, crmFetch } from "@/lib/crm/request";
import { formatRulesAt } from "@/lib/rules/storage";
import { upsertMessage } from "@/lib/messages/store";
import type {
  Message,
  MessageAttachment,
  MessageStatus,
  MessageType,
} from "@/lib/messages/types";

export type CrmMessageQuery = {
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

export function workspaceMessagesPath(workspaceId: string, suffix = ""): string {
  return `/v1/workspaces/${workspaceId}/messages${suffix}`;
}

export function globalMessagesPath(suffix = ""): string {
  return `/v1/messages${suffix}`;
}

export function relatedMessagesPath(
  workspaceId: string,
  relatedType: string,
  relatedId: string,
): string {
  return `/v1/workspaces/${workspaceId}/${relatedType}/${relatedId}/messages`;
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
    for (const key of ["items", "messages", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function mapMessageType(raw: string): MessageType {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("internal")) return "Internal";
  if (value.includes("system")) return "System";
  return "External";
}

function apiMessageType(type: MessageType): string {
  return type.toUpperCase();
}

export function mapMessageStatus(raw: string): MessageStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("fail") || value.includes("bounce") || value.includes("cancel")) {
    return "Failed";
  }
  if (value.includes("read") || value.includes("open")) return "Read";
  if (value.includes("deliver")) return "Delivered";
  if (value.includes("send") || value.includes("sent") || value.includes("queue")) {
    return "Sent";
  }
  return "Draft";
}

function apiMessageStatus(status: MessageStatus): string {
  return status.toUpperCase();
}

function formatWhen(raw: unknown): string | undefined {
  const value = pickStr(raw);
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return formatRulesAt(new Date(parsed));
}

export function normalizeMessageAttachment(
  raw: Record<string, unknown>,
  index: number,
): MessageAttachment {
  return {
    id: pickStr(raw.id, raw.attachmentId, raw.uuid) || `msga-${index}`,
    name: pickStr(raw.name, raw.fileName, raw.filename, raw.title, "Attachment"),
    sizeLabel: pickStr(raw.sizeLabel, raw.size) || undefined,
  };
}

function mapAttachments(raw: unknown): MessageAttachment[] {
  return extractRecords(raw).map((row, index) =>
    normalizeMessageAttachment(row, index),
  );
}

export function normalizeMessage(
  raw: Record<string, unknown>,
  index: number,
): Message {
  const related =
    raw.relatedTo && typeof raw.relatedTo === "object"
      ? (raw.relatedTo as Record<string, unknown>)
      : null;
  const toRaw = raw.to ?? raw.recipient ?? raw.toName;
  const to =
    Array.isArray(toRaw)
      ? toRaw.map((item) => pickStr(item)).filter(Boolean).join(", ")
      : pickStr(toRaw);
  return {
    id: pickStr(raw.id, raw.uuid, raw.messageId) || `crm-msg-${index}`,
    type: mapMessageType(pickStr(raw.type, raw.channel, raw.kind, "EXTERNAL")),
    subject: pickStr(raw.subject, raw.title, raw.name, "Untitled message"),
    body: pickStr(raw.body, raw.text, raw.html, raw.content, ""),
    from: pickStr(raw.from, raw.sender, raw.fromName, "—"),
    to: to || "—",
    relatedTo:
      pickStr(
        related && pickStr(related.name, related.title, related.label),
        raw.relatedName,
        raw.relatedType && raw.relatedId
          ? `${raw.relatedType}: ${raw.relatedId}`
          : "",
        typeof raw.relatedTo === "string" ? raw.relatedTo : "",
      ) || undefined,
    relatedType: pickStr(raw.relatedType, related && related.type) || undefined,
    relatedId: pickStr(raw.relatedId, related && related.id) || undefined,
    status: mapMessageStatus(pickStr(raw.status, raw.state, "DRAFT")),
    sentDate: formatWhen(raw.sentAt ?? raw.sentDate ?? raw.deliveredAt),
    template: pickStr(raw.template, raw.templateName) || undefined,
    attachments: mapAttachments(raw.attachments ?? raw.files),
  };
}

export function normalizeMessages(data: unknown): Message[] {
  return extractRecords(data).map((row, index) => normalizeMessage(row, index));
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
  if (!access) throw new Error("Sign in to manage messages");
  return run(access, false);
}

async function messagesPath(suffix: string, query = ""): Promise<string> {
  const scoped = await ensureCrmSession();
  if (scoped) {
    return `${workspaceMessagesPath(scoped.workspaceId, suffix)}${query}`;
  }
  return `${globalMessagesPath(suffix)}${query}`;
}

async function relatedWorkspaceId(): Promise<string | null> {
  const scoped = await ensureCrmSession();
  if (scoped?.workspaceId && isUuid(scoped.workspaceId)) return scoped.workspaceId;
  const env = process.env.NEXT_PUBLIC_WORKSPACE_ID?.trim();
  return env && isUuid(env) ? env : null;
}

async function crmMessagesFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (isBoundCrmSession()) {
    const scoped = await ensureCrmSession();
    if (scoped) return crmFetch<T>(scoped, path, init);
    const access = await ensureCrmAccess();
    if (!access) throw new Error("Sign in to manage messages");
    return crmFetch<T>(access, path, init);
  }
  return crmBffFetch<T>(path, init);
}

async function messagesGet(suffix: string, query = ""): Promise<unknown> {
  if (!isBoundCrmSession()) {
    return crmBffFetch(await messagesPath(suffix, query));
  }
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceMessagesPath((session as CrmSession).workspaceId, suffix)
      : globalMessagesPath(suffix);
    return crmFetch(session, `${path}${query}`);
  });
}

async function messagesMutate(suffix: string, init: RequestInit): Promise<unknown> {
  if (!isBoundCrmSession()) {
    return crmBffFetch(await messagesPath(suffix), init);
  }
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceMessagesPath((session as CrmSession).workspaceId, suffix)
      : globalMessagesPath(suffix);
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

async function messagesBlob(suffix: string): Promise<Blob> {
  if (!isBoundCrmSession()) {
    const path = await messagesPath(suffix);
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
      ? workspaceMessagesPath((session as CrmSession).workspaceId, suffix)
      : globalMessagesPath(suffix);
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
    out[key] = value;
  }
  return out;
}

function asMessage(data: unknown): Message | null {
  const items = normalizeMessages(data);
  const first = items[0];
  if (first && isUuid(first.id) && first.subject !== "Untitled message") {
    return first;
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const mapped = normalizeMessage(data as Record<string, unknown>, 0);
    if (mapped && isUuid(mapped.id) && mapped.subject !== "Untitled message") {
      return mapped;
    }
  }
  return null;
}

export async function listCrmMessages(
  query: CrmMessageQuery = {},
): Promise<Message[]> {
  return normalizeMessages(
    await messagesGet(
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

export async function getCrmMessage(id: string): Promise<Message | null> {
  return asMessage(await messagesGet(`/${id}`));
}

export async function listAllCrmMessages(): Promise<Message[]> {
  return normalizeMessages(await messagesGet("/all"));
}

export async function listRecentCrmMessages(): Promise<Message[]> {
  return normalizeMessages(await messagesGet("/recent"));
}

export async function listUnreadCrmMessages(): Promise<Message[]> {
  return normalizeMessages(await messagesGet("/unread"));
}

export async function listRelatedCrmMessages(
  relatedType: string,
  relatedId: string,
): Promise<Message[]> {
  const workspaceId = await relatedWorkspaceId();
  if (!workspaceId) throw new Error("Sign in to load related messages");
  return normalizeMessages(
    await crmMessagesFetch(
      relatedMessagesPath(workspaceId, relatedType, relatedId),
    ),
  );
}

export function toCreateMessageBody(input: {
  type: MessageType;
  subject: string;
  body: string;
  from?: string;
  to: string;
  relatedTo?: string;
  relatedType?: string;
  relatedId?: string;
  status?: MessageStatus;
  template?: string;
}): Record<string, unknown> {
  return compactBody({
    type: apiMessageType(input.type),
    subject: input.subject.trim(),
    body: input.body,
    text: input.body,
    from: input.from,
    to: input.to,
    relatedTo: input.relatedTo,
    relatedType: input.relatedType,
    relatedId: isUuid(input.relatedId) ? input.relatedId : undefined,
    status: input.status ? apiMessageStatus(input.status) : "DRAFT",
    template: input.template,
  });
}

export async function createCrmMessage(
  input: Parameters<typeof toCreateMessageBody>[0],
): Promise<Message | null> {
  return asMessage(
    await messagesMutate("", {
      method: "POST",
      body: JSON.stringify(toCreateMessageBody(input)),
    }),
  );
}

export async function updateCrmMessage(
  id: string,
  patch: Partial<Message>,
): Promise<Message | null> {
  const body: Record<string, unknown> = {};
  if (patch.subject != null) body.subject = patch.subject;
  if (patch.body != null) {
    body.body = patch.body;
    body.text = patch.body;
  }
  if (patch.from != null) body.from = patch.from;
  if (patch.to != null) body.to = patch.to;
  if (patch.type) body.type = apiMessageType(patch.type);
  if (patch.status) body.status = apiMessageStatus(patch.status);
  if (patch.template != null) body.templateName = patch.template;
  if (patch.relatedTo != null) body.relatedTo = patch.relatedTo;
  return asMessage(
    await messagesMutate(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteCrmMessage(id: string): Promise<void> {
  await messagesMutate(`/${id}`, { method: "DELETE" });
}

export async function markCrmMessageRead(id: string): Promise<Message | null> {
  return asMessage(
    await messagesMutate(`/${id}/read`, { method: "POST", body: "{}" }),
  );
}

export async function markCrmMessageUnread(id: string): Promise<Message | null> {
  return asMessage(
    await messagesMutate(`/${id}/unread`, { method: "POST", body: "{}" }),
  );
}

export async function sendCrmMessage(
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Message | null> {
  return asMessage(
    await messagesMutate(`/${id}/send`, {
      method: "POST",
      body: JSON.stringify(extra),
    }),
  );
}

export async function retryCrmMessage(id: string): Promise<Message | null> {
  return asMessage(
    await messagesMutate(`/${id}/retry`, { method: "POST", body: "{}" }),
  );
}

export async function cancelCrmMessage(id: string): Promise<Message | null> {
  return asMessage(
    await messagesMutate(`/${id}/cancel`, { method: "POST", body: "{}" }),
  );
}

export async function attachCrmMessageObject(
  id: string,
  extra: Record<string, unknown>,
): Promise<MessageAttachment | null> {
  const data = await messagesMutate(`/${id}/attachments`, {
    method: "POST",
    body: JSON.stringify(extra),
  });
  const rows = mapAttachments(data);
  if (rows[0]) return rows[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeMessageAttachment(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function deleteCrmMessageAttachment(
  id: string,
  attachmentId: string,
): Promise<void> {
  await messagesMutate(`/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export async function downloadCrmMessageAttachment(
  id: string,
  attachmentId: string,
): Promise<Blob> {
  return messagesBlob(`/${id}/attachments/${attachmentId}/download`);
}

export async function tryCrmMessage<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteMessage(row: Message | null) {
  if (row) upsertMessage(row);
  return row;
}

export function isCrmMessageId(id: string): boolean {
  return isUuid(id);
}
