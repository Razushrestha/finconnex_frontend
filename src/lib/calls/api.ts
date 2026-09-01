import {
  ensureCrmAccess,
  ensureCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
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
    const rec = data as { items?: unknown; calls?: unknown };
    if (Array.isArray(rec.items)) return extractRecords(rec.items);
    if (Array.isArray(rec.calls)) return extractRecords(rec.calls);
  }
  return [];
}

export function normalizeCrmCalls(data: unknown): Call[] {
  return extractRecords(data)
    .map((raw, index) => normalizeCrmCall(raw, index))
    .filter((item): item is Call => item != null);
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

async function callsGet(suffix: string, query = ""): Promise<unknown> {
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceCallsPath((session as CrmSession).workspaceId, suffix)
      : globalCallsPath(suffix);
    return crmFetch(session, `${path}${query}`);
  });
}

async function callsMutate(
  suffix: string,
  init: RequestInit,
  opts?: { allowGlobalOnly?: boolean },
): Promise<unknown> {
  return withSession((session, scoped) => {
    if (opts?.allowGlobalOnly && !scoped) {
      return crmFetch(session, `${globalCallsPath(suffix)}`, init);
    }
    const path = scoped
      ? workspaceCallsPath((session as CrmSession).workspaceId, suffix)
      : globalCallsPath(suffix);
    return crmFetch(session, path, init);
  });
}

export async function listCrmCalls(query: CrmCallQuery = {}): Promise<Call[]> {
  return normalizeCrmCalls(
    await callsGet(
      "",
      toQuery({
        page: query.page,
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

export async function listCrmCallHistory(): Promise<Call[]> {
  return normalizeCrmCalls(await callsGet("/history"));
}

export async function getCrmCall(id: string): Promise<Call | null> {
  const items = normalizeCrmCalls(await callsGet(`/${id}`));
  return items[0] ?? null;
}

export async function listRelatedCrmCalls(
  relatedType: string,
  relatedId: string,
): Promise<Call[]> {
  const scoped = await ensureCrmSession();
  if (!scoped) throw new Error("Sign in to load related calls");
  const data = await crmFetch(
    scoped,
    relatedCallsPath(scoped.workspaceId, relatedType, relatedId),
  );
  return normalizeCrmCalls(data);
}

function toCreateBody(input: {
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
  contact?: string;
  duration?: string;
}) {
  return {
    subject: input.subject,
    title: input.subject,
    type: apiCallType(input.callType),
    callType: apiCallType(input.callType),
    status: apiCallStatus(input.status),
    scheduledAt: input.date,
    startAt: input.date,
    fromNumber: input.fromNumber,
    notes: input.notes,
    agenda: input.agenda,
    purpose: input.purpose,
    assignedTo: input.assignedTo,
    relatedTo: input.relatedTo,
    contact: input.contact,
    duration: input.duration,
  };
}

export async function createCrmCall(
  input: Parameters<typeof toCreateBody>[0],
): Promise<Call | null> {
  const body = JSON.stringify(toCreateBody(input));
  try {
    const scoped = await ensureCrmSession();
    if (scoped) {
      const data = await crmFetch(scoped, workspaceCallsPath(scoped.workspaceId), {
        method: "POST",
        body,
      });
      return normalizeCrmCalls(data)[0] ?? normalizeCrmCall(
        (data as Record<string, unknown>) ?? {},
        0,
      );
    }
  } catch {
    /* fall through to global create */
  }
  const data = await callsMutate("", { method: "POST", body }, { allowGlobalOnly: true });
  return (
    normalizeCrmCalls(data)[0] ??
    normalizeCrmCall((data as Record<string, unknown>) ?? {}, 0)
  );
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
  return normalizeCrmCalls(data)[0] ?? null;
}

export async function deleteCrmCall(id: string): Promise<void> {
  await callsMutate(`/${id}`, { method: "DELETE" });
}

export async function startCrmCall(id: string): Promise<Call | null> {
  return normalizeCrmCalls(await callsMutate(`/${id}/start`, { method: "POST", body: "{}" }))[0] ?? null;
}

export async function completeCrmCall(
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Call | null> {
  return (
    normalizeCrmCalls(
      await callsMutate(`/${id}/complete`, {
        method: "POST",
        body: JSON.stringify(extra),
      }),
    )[0] ?? null
  );
}

export async function cancelCrmCall(
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Call | null> {
  return (
    normalizeCrmCalls(
      await callsMutate(`/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify(extra),
      }),
    )[0] ?? null
  );
}

export async function rescheduleCrmCall(
  id: string,
  scheduledAt: string,
): Promise<Call | null> {
  return (
    normalizeCrmCalls(
      await callsMutate(`/${id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledAt, date: scheduledAt }),
      }),
    )[0] ?? null
  );
}

export async function logCrmCallOutcome(
  id: string,
  extra: Record<string, unknown>,
): Promise<Call | null> {
  return (
    normalizeCrmCalls(
      await callsMutate(`/${id}/log-outcome`, {
        method: "POST",
        body: JSON.stringify(extra),
      }),
    )[0] ?? null
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
