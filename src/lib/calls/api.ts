import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import type { Call, CallStatus, CallType } from "@/lib/calls/types";
import { toE164 } from "@/lib/contacts/phone";

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
      raw.callDate ??
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
  if (first && isUuid(first.id)) return first;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const mapped = normalizeCrmCall(data as Record<string, unknown>, 0);
    if (mapped && isUuid(mapped.id)) return mapped;
  }
  return null;
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
  toNumber?: string;
};

function fallbackVoicePhone() {
  return (
    toE164(process.env.NEXT_PUBLIC_TWILIO_SMS_TO) ||
    toE164(process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER)
  );
}

function resolveOutboundPhone(raw?: string): string | undefined {
  const trimmed = (raw ?? "").trim();
  if (trimmed) return toE164(trimmed);
  return fallbackVoicePhone();
}

function durationSeconds(raw?: string): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 0 && n <= 86400) return n;
  return undefined;
}

function toCreateBody(input: CreateCrmCallInput) {
  const callDate = toCallIso(input.date) || new Date().toISOString();
  const assignedToId = isUuid(input.assignedTo) ? input.assignedTo : undefined;
  const relatedType = (input.relatedType ?? "").trim().toUpperCase();
  const relatedId = isUuid(input.relatedId) ? input.relatedId : undefined;
  const contactId = isUuid(input.contactId)
    ? input.contactId
    : isUuid(input.contact)
      ? input.contact
      : relatedType === "CONTACT"
        ? relatedId
        : undefined;
  const leadId = relatedType === "LEAD" ? relatedId : undefined;
  const companyId = relatedType === "COMPANY" ? relatedId : undefined;
  const dealId = relatedType === "DEAL" ? relatedId : undefined;
  const parentType = leadId
    ? "LEAD"
    : contactId
      ? "CONTACT"
      : companyId
        ? "COMPANY"
        : dealId
          ? "DEAL"
          : undefined;
  const phone = resolveOutboundPhone(input.toNumber) || resolveOutboundPhone(input.fromNumber);
  return compactBody({
    subject: input.subject.trim().slice(0, 255),
    callType: apiCallType(input.callType),
    callDate,
    phone,
    notes: input.notes,
    agenda: input.agenda,
    purpose: input.purpose,
    assignedToId,
    relatedType: parentType,
    leadId,
    contactId,
    companyId,
    dealId,
    duration: durationSeconds(input.duration),
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
  return created;
}

export async function updateCrmCall(
  id: string,
  patch: Partial<Call>,
): Promise<Call | null> {
  const body: Record<string, unknown> = {};
  if (patch.subject) body.subject = patch.subject.slice(0, 255);
  if (patch.callType) body.callType = apiCallType(patch.callType);
  if (patch.date) body.callDate = toCallIso(patch.date);
  const phone = toE164(patch.fromNumber);
  if (phone) body.phone = phone;
  if (patch.notes != null) body.notes = patch.notes;
  if (patch.agenda != null) body.agenda = patch.agenda;
  if (patch.purpose != null) body.purpose = patch.purpose;
  if (patch.assignedTo && isUuid(patch.assignedTo)) {
    body.assignedToId = patch.assignedTo;
  }
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
  _extra: Record<string, unknown> = {},
): Promise<Call | null> {
  return asCall(await callsMutate(`/${id}/dial`, { method: "POST", body: "{}" }));
}

export async function completeCrmCall(
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Call | null> {
  const outcome = pickStr(extra.outcome, extra.notes, "Completed").slice(0, 2000);
  return asCall(
    await callsMutate(`/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ outcome }),
    }),
  );
}

export async function cancelCrmCall(
  id: string,
  _extra: Record<string, unknown> = {},
): Promise<Call | null> {
  return asCall(await callsMutate(`/${id}/cancel`, { method: "POST" }));
}

export async function rescheduleCrmCall(
  id: string,
  scheduledAt: string,
): Promise<Call | null> {
  const callDate = toCallIso(scheduledAt) || scheduledAt;
  return asCall(
    await callsMutate(`/${id}/reschedule`, {
      method: "POST",
      body: JSON.stringify({ callDate }),
    }),
  );
}

export async function logCrmCallOutcome(
  id: string,
  extra: Record<string, unknown>,
): Promise<Call | null> {
  const outcome = pickStr(extra.outcome, extra.notes, "Logged").slice(0, 2000);
  const rawStatus = pickStr(extra.status).toUpperCase().replace(/[\s-]+/g, "_");
  const status =
    rawStatus === "VOICEMAIL_LEFT" ||
    rawStatus === "LEFT_VOICEMAIL" ||
    rawStatus === "VOICEMAIL"
      ? "VOICEMAIL_LEFT"
      : rawStatus === "COMPLETED"
        ? "COMPLETED"
        : "NO_ANSWER";
  return asCall(
    await callsMutate(`/${id}/log-outcome`, {
      method: "POST",
      body: JSON.stringify({
        status,
        outcome,
        createFollowUpTask: extra.createFollowUpTask === true,
      }),
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
      status:
        status === "Voicemail Left" || status === "Left Voicemail"
          ? "VOICEMAIL_LEFT"
          : "NO_ANSWER",
      outcome: extra?.outcome ?? status,
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

export type PlaceOutboundCallInput = {
  phone?: string;
  name: string;
  subject?: string;
  relatedTo?: string;
  relatedType?: string;
  relatedId?: string;
  contactId?: string;
};

export async function placeOutboundCrmCall(
  input: PlaceOutboundCallInput,
): Promise<
  | { ok: true; call: Call }
  | { ok: false; call: Call | null; message: string }
> {
  const to = resolveOutboundPhone(input.phone);
  if (!to) {
    return {
      ok: false,
      call: null,
      message: `${input.name} has no phone number in E.164 format (e.g. +61481549363).`,
    };
  }
  const subject = input.subject?.trim() || `Outbound call — ${input.name}`;
  try {
    const created = await createCrmCall({
      subject,
      callType: "Outbound",
      status: "Scheduled",
      date: new Date().toISOString(),
      fromNumber: to,
      toNumber: to,
      assignedTo: input.name,
      contact: input.name,
      contactId: input.contactId,
      relatedTo: input.relatedTo,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
    });
    if (!created?.id || !isUuid(created.id)) {
      return {
        ok: false,
        call: created,
        message: "Sign in to a live CRM workspace to place the call.",
      };
    }
    const { mergeCrmCalls } = await import("@/lib/calls/store");
    mergeCrmCalls([created]);
    const withPhone = await updateCrmCall(created.id, {
      fromNumber: to,
      callType: "Outbound",
    });
    if (withPhone) mergeCrmCalls([withPhone]);
    // Nest claimVoiceDispatch requires SCHEDULED (or IN_PROGRESS). Dial first —
    // /start moves the row to IN_PROGRESS and used to 409 the Twilio dispatch.
    const dialed = await dialCrmCall(created.id, {
      to,
      toNumber: to,
      destination: to,
      phone: to,
    });
    if (dialed) mergeCrmCalls([dialed]);
    const started = await startCrmCall(created.id);
    if (started) mergeCrmCalls([started]);
    return { ok: true, call: started ?? dialed ?? created };
  } catch (err) {
    return {
      ok: false,
      call: null,
      message: err instanceof Error ? err.message : "Twilio Voice dial failed.",
    };
  }
}
