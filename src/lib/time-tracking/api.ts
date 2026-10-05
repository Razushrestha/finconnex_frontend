import { ensureCrmAccess, ensureCrmSession } from "@/lib/activity-timeline/auth";
import { listCrmDeals } from "@/lib/deals/api";
import { crmFetch } from "@/lib/crm/request";
import { listCrmTickets } from "@/lib/support/api";
import {
  RELATED_KINDS,
  TIME_STATUSES,
  formatTimeDate,
  replaceTimeEntries,
  upsertTimeEntry,
  type RelatedKind,
  type TimeEntry,
  type TimeEntryStatus,
  type TimeRelatedTo,
} from "@/lib/time-tracking/types";

export type TimeRelatedOption = TimeRelatedTo & { id?: string };

const KIND_TO_API: Record<RelatedKind, string> = {
  Matter: "MATTER",
  Deal: "DEAL",
  Ticket: "TICKET",
  Project: "PROJECT",
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toAuDate(value: unknown): string {
  const raw = pickStr(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return formatTimeDate();
}

function mapKind(value: unknown): RelatedKind {
  const raw = pickStr(value).toUpperCase();
  const hit = RELATED_KINDS.find((kind) => KIND_TO_API[kind] === raw);
  return hit ?? "Deal";
}

function mapStatus(value: unknown): TimeEntryStatus {
  const raw = pickStr(value).toUpperCase();
  const hit = TIME_STATUSES.find(
    (status) => status.toUpperCase() === raw.replace(/_/g, ""),
  );
  if (raw === "RUNNING") return "Running";
  if (raw === "INVOICED") return "Invoiced";
  return hit ?? "Logged";
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (Array.isArray(data[0])) return extractRecords(data[0]);
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of ["items", "entries", "records", "rows", "data"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
  }
  return [];
}

function asRecord(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return asRecord(data[0]);
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  if (rec.data && typeof rec.data === "object") return asRecord(rec.data);
  return rec;
}

export function mapTimeEntry(raw: Record<string, unknown>): TimeEntry {
  const user =
    raw.user && typeof raw.user === "object"
      ? (raw.user as Record<string, unknown>)
      : null;
  const minutes = Number(raw.durationMinutes ?? 0);
  const rate = Number(raw.hourlyRate ?? 0);
  const kind = mapKind(raw.relatedKind ?? (raw.dealId ? "DEAL" : "PROJECT"));
  const now = formatTimeDate();
  return {
    id: pickStr(raw.id),
    entryId: pickStr(raw.entryCode, raw.entryId) || pickStr(raw.id).slice(0, 8),
    relatedTo: {
      kind,
      name: pickStr(raw.relatedName, raw.dealName) || kind,
      clientId: pickStr(raw.companyId) || undefined,
    },
    user: pickStr(user?.name, user?.email, raw.userName, raw.userId) || "User",
    date: toAuDate(raw.workDate ?? raw.startedAt ?? raw.createdAt) || now,
    durationHours: Math.round((minutes / 60) * 100) / 100,
    billable: raw.isBillable !== false,
    rate: Number.isFinite(rate) ? rate : 0,
    description: pickStr(raw.description),
    status: mapStatus(raw.workflowStatus ?? raw.trackingStatus),
    timerStartedAt: pickStr(raw.startedAt) || undefined,
    invoiceId: pickStr(raw.invoiceId) || undefined,
    createdBy: pickStr(user?.name, raw.userId),
    createdAt: pickStr(raw.createdAt),
    modifiedAt: pickStr(raw.updatedAt, raw.createdAt),
    audit: [],
  };
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

async function timeRequest(path: string, init?: RequestInit) {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to use time tracking");
  return crmFetch(auth, path, init);
}

export async function listCrmTimeEntries(): Promise<TimeEntry[]> {
  const data = await timeRequest("/v1/time-entries?limit=100");
  return extractRecords(data)
    .map(mapTimeEntry)
    .filter((row) => row.id);
}

export async function listTimeRelatedOptions(): Promise<TimeRelatedOption[]> {
  const [deals, tickets] = await Promise.all([
    listCrmDeals({ limit: 50 }).catch(() => []),
    listCrmTickets({ limit: 50 }).catch(() => []),
  ]);
  return [
    ...deals.map((deal) => ({
      id: deal.id,
      kind: "Deal" as const,
      name: deal.name || "Deal",
    })),
    ...tickets.map((ticket) => ({
      id: ticket.id,
      kind: "Ticket" as const,
      name: ticket.subject || ticket.ticketId || "Ticket",
    })),
  ];
}

function relatedBody(related?: TimeRelatedOption) {
  if (!related) return {};
  return {
    relatedKind: KIND_TO_API[related.kind],
    relatedId: related.id,
    relatedName: related.name,
    ...(related.kind === "Deal" && related.id ? { dealId: related.id } : {}),
  };
}

export async function startCrmTimer(input: {
  related?: TimeRelatedOption;
  description?: string;
  billable?: boolean;
  rate?: number;
}): Promise<TimeEntry> {
  const data = await timeRequest("/v1/time-entries/timer/start", {
    method: "POST",
    body: JSON.stringify({
      description: input.description || "Timer session",
      isBillable: input.billable ?? true,
      ...(input.rate ? { hourlyRate: input.rate.toFixed(2) } : {}),
      ...relatedBody(input.related),
    }),
  });
  const row = asRecord(data);
  if (!row) throw new Error("Timer did not start");
  const entry = mapTimeEntry(row);
  upsertTimeEntry(entry);
  return entry;
}

export async function stopCrmTimer(id: string): Promise<TimeEntry> {
  const data = await timeRequest(`/v1/time-entries/${id}/timer/stop`, {
    method: "POST",
  });
  const row = asRecord(data);
  if (!row) throw new Error("Timer did not stop");
  const entry = mapTimeEntry(row);
  upsertTimeEntry(entry);
  return entry;
}

export async function createCrmTimeEntry(input: {
  related: TimeRelatedOption;
  date: string;
  durationHours: number;
  billable: boolean;
  rate: number;
  description: string;
}): Promise<TimeEntry> {
  const minutes = Math.max(1, Math.round(input.durationHours * 60));
  const iso = input.date.includes("/")
    ? input.date.split("/").reverse().join("-")
    : input.date;
  const data = await timeRequest("/v1/time-entries", {
    method: "POST",
    body: JSON.stringify({
      description: input.description,
      durationMinutes: minutes,
      isBillable: input.billable,
      hourlyRate: input.rate.toFixed(2),
      workDate: iso,
      startedAt: new Date(`${iso}T00:00:00.000Z`).toISOString(),
      ...relatedBody(input.related),
    }),
  });
  const row = asRecord(data);
  if (!row) throw new Error("Time entry was not logged");
  const entry = mapTimeEntry(row);
  upsertTimeEntry(entry);
  return entry;
}

export async function updateCrmTimeEntry(
  id: string,
  patch: { billable?: boolean; description?: string; rate?: number },
): Promise<TimeEntry> {
  const data = await timeRequest(`/v1/time-entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(patch.billable !== undefined ? { isBillable: patch.billable } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description }
        : {}),
      ...(patch.rate !== undefined
        ? { hourlyRate: patch.rate.toFixed(2) }
        : {}),
    }),
  });
  const row = asRecord(data);
  if (!row) throw new Error("Time entry was not updated");
  const entry = mapTimeEntry(row);
  upsertTimeEntry(entry);
  return entry;
}

export async function approveCrmTimeEntries(ids: string[]): Promise<void> {
  await timeRequest("/v1/time-entries/approve", {
    method: "POST",
    body: JSON.stringify({ entryIds: ids }),
  });
}

export async function invoiceCrmTimeEntries(
  ids: string[],
): Promise<{ id: string; invoiceNumber?: string }> {
  const data = await timeRequest("/v1/time-entries/invoice", {
    method: "POST",
    body: JSON.stringify({ entryIds: ids }),
  });
  const row = asRecord(data);
  return {
    id: pickStr(row?.id),
    invoiceNumber: pickStr(row?.invoiceNumber) || undefined,
  };
}

export async function syncCrmTimeEntries(): Promise<TimeEntry[]> {
  const rows = await listCrmTimeEntries();
  replaceTimeEntries(rows);
  return rows;
}
