import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import type { Call, CallStatus, CallType } from "@/lib/calls/types";

export type CrmCallQuery = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
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

export function workspaceCallsPath(
  workspaceId: string,
  suffix = "",
): string {
  return `/v1/workspaces/${workspaceId}/calls${suffix}`;
}

export function globalCallsPath(suffix = ""): string {
  return `/v1/calls${suffix}`;
}

export function relatedCallsPath(
  workspaceId: string,
  relatedType: string,
  relatedId: string,
): string {
  return `/v1/workspaces/${workspaceId}/${relatedType}/${relatedId}/calls`;
}

function mapCallType(raw: string): CallType {
  const value = raw.toLowerCase();
  if (value.includes("in") && !value.includes("out")) return "Inbound";
  if (value.includes("miss")) return "Missed";
  if (value.includes("voice")) return "Voicemail";
  return "Outbound";
}

function mapCallStatus(raw: string): CallStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("complete") || value.includes("done")) return "Completed";
  if (value.includes("cancel")) return "Cancelled";
  if (value.includes("wrong")) return "Wrong Number";
  if (value.includes("busy")) return "Busy";
  if (value.includes("no answer") || value.includes("noanswer")) return "No Answer";
  if (value.includes("left voice") || value.includes("voicemail left")) {
    return "Voicemail Left";
  }
  if (value.includes("voice")) return "Left Voicemail";
  return "Scheduled";
}

function apiCallType(type: CallType): string {
  if (type === "Inbound") return "INBOUND";
  if (type === "Missed") return "MISSED";
  if (type === "Voicemail") return "VOICEMAIL";
  return "OUTBOUND";
}

function apiCallStatus(status: CallStatus): string {
  if (status === "Completed") return "COMPLETED";
  if (status === "Cancelled") return "CANCELLED";
  if (status === "No Answer") return "NO_ANSWER";
  if (status === "Busy") return "BUSY";
  if (status === "Wrong Number") return "WRONG_NUMBER";
  if (status === "Voicemail Left" || status === "Left Voicemail") return "VOICEMAIL";
  return "SCHEDULED";
}

function asDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  return value.trim();
}

export function normalizeCrmCall(
  raw: Record<string, unknown>,
  index: number,
): Call | null {
  const subject = pickStr(
    raw.subject,
    raw.title,
    raw.name,
    raw.summary,
    "Untitled call",
  );
  const id = pickStr(raw.id, raw.uuid, raw.callId) || `crm-call-${index}`;
  const related =
    raw.relatedTo && typeof raw.relatedTo === "object"
      ? (raw.relatedTo as Record<string, unknown>)
      : null;
  const owner =
    raw.owner && typeof raw.owner === "object"
      ? (raw.owner as Record<string, unknown>)
      : null;

  return {
    id,
    subject,
    relatedTo: pickStr(
      related && pickStr(related.name, related.title, related.label),
      raw.relatedName,
      raw.relatedType && raw.relatedId
        ? `${raw.relatedType}: ${raw.relatedId}`
        : "",
      typeof raw.relatedTo === "string" ? raw.relatedTo : "",
    ) || undefined,
    contact: pickStr(raw.contactName, raw.contact, raw.callFor, raw.toName) || undefined,
    callFor: pickStr(raw.callFor, raw.contactName, raw.contact) || undefined,
    fromNumber: pickStr(raw.fromNumber, raw.phone, raw.from) || undefined,
    callType: mapCallType(pickStr(raw.type, raw.callType, raw.direction, "OUTBOUND")),
    status: mapCallStatus(pickStr(raw.status, raw.state, "SCHEDULED")),
    date: asDate(
      raw.scheduledAt ??
        raw.startAt ??
        raw.startedAt ??
        raw.date ??
        raw.completedAt ??
        raw.createdAt,
    ) || new Date().toISOString(),
    duration: pickStr(raw.duration, raw.durationLabel) || undefined,
    notes: pickStr(raw.notes, raw.outcomeNotes, raw.description) || undefined,
    agenda: pickStr(raw.agenda) || undefined,
    purpose: pickStr(raw.purpose, raw.outcome) || undefined,
    assignedTo: pickStr(
      owner && pickStr(owner.name, owner.email),
      raw.ownerName,
      raw.assignedTo,
      raw.assignee,
      "—",
    ),
    outcome: pickStr(raw.outcome, raw.result) || undefined,
  };
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
    for (const key of ["items", "calls", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    for (const key of ["item", "call", "record"]) {
      const nested = rec[key];
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        return extractRecords([nested]);
      }
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function normalizeCrmCalls(data: unknown): Call[] {
  return extractRecords(data)
    .map((raw, index) => normalizeCrmCall(raw, index))
    .filter((item): item is Call => item != null);
}

async function crmCallsFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (isBoundCrmSession()) {
    const scoped = await ensureCrmSession();
    if (scoped) return crmFetch<T>(scoped, path, init);
    const access = await ensureCrmAccess();
    if (!access) throw new Error("Sign in to load calls");
    return crmFetch<T>(access, path, init);
  }
  return crmBffFetch<T>(path, init);
}

async function withSession<T>(
  run: (session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">, scoped: boolean) => Promise<T>,
): Promise<T> {
  const scoped = await ensureCrmSession();
  if (scoped) return run(scoped, true);
  const access = await ensureCrmAccess();
  if (!access) throw new Error("Sign in to load calls");
  return run(access, false);
}

async function callsPath(suffix: string, query = ""): Promise<string> {
  const scoped = await ensureCrmSession();
  if (scoped) {
    return `${workspaceCallsPath(scoped.workspaceId, suffix)}${query}`;
  }
  return `${globalCallsPath(suffix)}${query}`;
}

async function callsGet(suffix: string, query = ""): Promise<unknown> {
  if (!isBoundCrmSession()) {
    return crmBffFetch(await callsPath(suffix, query));
  }
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceCallsPath((session as CrmSession).workspaceId, suffix)
      : globalCallsPath(suffix);
    return crmFetch(session, `${path}${query}`);
  });
}

async function callsMutate(suffix: string, init: RequestInit): Promise<unknown> {
  if (!isBoundCrmSession()) {
    return crmBffFetch(await callsPath(suffix), init);
  }
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceCallsPath((session as CrmSession).workspaceId, suffix)
      : globalCallsPath(suffix);
    return crmFetch(session, path, init);
  });
}

async function relatedWorkspaceId(): Promise<string | null> {
  const scoped = await ensureCrmSession();
  if (scoped?.workspaceId && isUuid(scoped.workspaceId)) return scoped.workspaceId;
  const env = process.env.NEXT_PUBLIC_WORKSPACE_ID?.trim();
  return env && isUuid(env) ? env : null;
}

export async function listCrmCalls(query: CrmCallQuery = {}): Promise<Call[]> {
  return normalizeCrmCalls(
    await callsGet(
      "",
      toQuery({
        page: query.page ?? 1,
        limit: query.limit ?? 100,
        status: query.status,
        search: query.search,
      }),
    ),
  );
}

export async function listUpcomingCrmCalls(): Promise<Call[]> {
  return normalizeCrmCalls(await callsGet("/upcoming"));
}

export async function listTodayCrmCalls(): Promise<Call[]> {
  return normalizeCrmCalls(await callsGet("/today"));
}

export async function listCompletedCrmCalls(): Promise<Call[]> {
  return normalizeCrmCalls(await callsGet("/completed"));
}

export async function listMissedCrmCalls(): Promise<Call[]> {
  return normalizeCrmCalls(await callsGet("/missed"));
}

export async function listMyCrmCalls(): Promise<Call[]> {
  return normalizeCrmCalls(await callsGet("/my"));
}

export async function listCrmCallHistory(): Promise<Call[]> {
  return normalizeCrmCalls(await callsGet("/history"));
}

export async function getCrmCall(id: string): Promise<Call | null> {
  return asCall(await callsGet(`/${id}`));
}

export async function listRelatedCrmCalls(
  relatedType: string,
  relatedId: string,
): Promise<Call[]> {
  const workspaceId = await relatedWorkspaceId();
  if (!workspaceId) throw new Error("Sign in to load related calls");
  const data = await crmCallsFetch(
    relatedCallsPath(workspaceId, relatedType, relatedId),
  );
  return normalizeCrmCalls(data);
}

function compactBody(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

function toCallIso(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return value;
}

function asCall(data: unknown): Call | null {
  const items = normalizeCrmCalls(data);
  const first = items[0];
  if (first && isUuid(first.id) && first.subject !== "Untitled call") return first;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const mapped = normalizeCrmCall(data as Record<string, unknown>, 0);
    if (mapped && isUuid(mapped.id) && mapped.subject !== "Untitled call") {
      return mapped;
    }
  }
  return null;
}

function sameCallTitle(a: string, b: string) {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  return left === right || left.includes(right) || right.includes(left);
}

export type CreateCrmCallInput = {
  subject: string;
  callType: CallType;
  status: CallStatus;
  date: string;
  fromNumber?: string;
  notes?: string;
  agenda?: string;
  purpose?: string;
  assignedTo: string;
  relatedTo?: string;
  relatedType?: string;
  relatedId?: string;
  contact?: string;
  contactId?: string;
  duration?: string;
};

function toCreateBody(input: CreateCrmCallInput) {
  const scheduledAt = toCallIso(input.date);
  const assigneeId = isUuid(input.assignedTo) ? input.assignedTo : undefined;
  const contactId = isUuid(input.contactId)
    ? input.contactId
    : isUuid(input.contact)
      ? input.contact
      : undefined;
  const relatedId = isUuid(input.relatedId) ? input.relatedId : undefined;
  return compactBody({
    subject: input.subject.trim(),
    title: input.subject.trim(),
    type: apiCallType(input.callType),
    status: apiCallStatus(input.status),
    scheduledAt: scheduledAt || undefined,
    startAt: scheduledAt || undefined,
    fromNumber: input.fromNumber,
    notes: input.notes,
    agenda: input.agenda,
    purpose: input.purpose,
    assigneeId,
    ownerId: assigneeId,
    contactId,
    relatedType: input.relatedType?.toUpperCase(),
    relatedId,
    duration: input.duration,
  });
}

export async function createCrmCall(
  input: CreateCrmCallInput,
): Promise<Call | null> {
  const created = asCall(
    await callsMutate("", {
      method: "POST",
      body: JSON.stringify(toCreateBody(input)),
    }),
  );
  if (created && !sameCallTitle(created.subject, input.subject)) return null;
  return created;
}

export async function updateCrmCall(
  id: string,
  patch: Partial<Call>,
): Promise<Call | null> {
  const body: Record<string, unknown> = {};
  if (patch.subject) body.subject = patch.subject;
  if (patch.callType) body.type = apiCallType(patch.callType);
  if (patch.status) body.status = apiCallStatus(patch.status);
  if (patch.date) body.scheduledAt = patch.date;
  if (patch.fromNumber != null) body.fromNumber = patch.fromNumber;
  if (patch.notes != null) body.notes = patch.notes;
  if (patch.agenda != null) body.agenda = patch.agenda;
  if (patch.purpose != null) body.purpose = patch.purpose;
  if (patch.assignedTo) body.assignedTo = patch.assignedTo;
  if (patch.outcome != null) body.outcome = patch.outcome;
  const data = await callsMutate(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return asCall(data);
}

export async function deleteCrmCall(id: string): Promise<void> {
  await callsMutate(`/${id}`, { method: "DELETE" });
}

export async function startCrmCall(id: string): Promise<Call | null> {
  return asCall(await callsMutate(`/${id}/start`, { method: "POST", body: "{}" }));
}

export async function dialCrmCall(
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Call | null> {
  return asCall(
    await callsMutate(`/${id}/dial`, {
      method: "POST",
      body: JSON.stringify(extra),
    }),
  );
}

export async function completeCrmCall(
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Call | null> {
  return asCall(
    await callsMutate(`/${id}/complete`, {
      method: "POST",
      body: JSON.stringify(extra),
    }),
  );
}

export async function cancelCrmCall(
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Call | null> {
  return asCall(
    await callsMutate(`/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(extra),
    }),
  );
}

export async function rescheduleCrmCall(
  id: string,
  scheduledAt: string,
): Promise<Call | null> {
  return asCall(
    await callsMutate(`/${id}/reschedule`, {
      method: "POST",
      body: JSON.stringify({ scheduledAt, date: scheduledAt }),
    }),
  );
}

export async function logCrmCallOutcome(
  id: string,
  extra: Record<string, unknown>,
): Promise<Call | null> {
  return asCall(
    await callsMutate(`/${id}/log-outcome`, {
      method: "POST",
      body: JSON.stringify(extra),
    }),
  );
}

export async function syncCallStatus(
  id: string,
  status: CallStatus,
  extra?: { date?: string; notes?: string; outcome?: string },
): Promise<Call | null> {
  if (status === "Completed") {
    return completeCrmCall(id, { notes: extra?.notes, outcome: extra?.outcome });
  }
  if (status === "Cancelled") {
    return cancelCrmCall(id, { reason: extra?.notes });
  }
  if (
    status === "No Answer" ||
    status === "Busy" ||
    status === "Wrong Number" ||
    status === "Voicemail Left" ||
    status === "Left Voicemail"
  ) {
    return logCrmCallOutcome(id, {
      outcome: extra?.outcome ?? status,
      notes: extra?.notes,
    });
  }
  if (extra?.date) return rescheduleCrmCall(id, extra.date);
  return updateCrmCall(id, { status, date: extra?.date, notes: extra?.notes });
}

export async function tryCrm<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function isCrmCallId(id: string) {
  return isUuid(id);
}
