import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  formatTicketAt,
  formatTicketDate,
  upsertTicket,
  type SupportTicket,
  type TicketCategory,
  type TicketNote,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support/types";

export type CrmTicketQuery = {
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

export function ticketsPath(suffix = ""): string {
  return `/v1/tickets${suffix}`;
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
      "tickets",
      "replies",
      "notes",
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

export function mapTicketStatus(raw: string): TicketStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("progress")) return "In Progress";
  if (value.includes("reopen")) return "Reopened";
  if (value.includes("pend")) return "Pending";
  if (value.includes("resolv")) return "Resolved";
  if (value.includes("close")) return "Closed";
  const hit = TICKET_STATUSES.find((s) => s.toLowerCase() === value);
  return hit ?? "New";
}

function apiTicketStatus(status: TicketStatus): string {
  if (status === "In Progress") return "IN_PROGRESS";
  return status.toUpperCase().replace(/\s+/g, "_");
}

export function mapTicketPriority(raw: string): TicketPriority {
  const value = raw.toLowerCase();
  return TICKET_PRIORITIES.find((p) => p.toLowerCase() === value) ?? "Medium";
}

function apiTicketPriority(priority: TicketPriority): string {
  return priority.toUpperCase();
}

export function mapTicketCategory(raw: string): TicketCategory | undefined {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("feature")) return "Feature Request";
  return TICKET_CATEGORIES.find((c) => c.toLowerCase() === value);
}

function apiTicketCategory(category: TicketCategory): string {
  if (category === "Feature Request") return "FEATURE_REQUEST";
  return category.toUpperCase();
}

function formatWhen(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) return value;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return formatTicketAt(new Date(parsed));
}

export function normalizeTicketNote(
  raw: Record<string, unknown>,
  index: number,
  kind: TicketNote["kind"],
): TicketNote {
  const author =
    raw.author && typeof raw.author === "object"
      ? (raw.author as Record<string, unknown>)
      : null;
  return {
    id: pickStr(raw.id, raw.uuid, raw.noteId, raw.replyId) || `crm-note-${index}`,
    kind,
    body: pickStr(raw.body, raw.text, raw.content, raw.message),
    at: formatWhen(raw.createdAt ?? raw.at ?? raw.sentAt) || formatTicketAt(),
    actor: pickStr(
      author && (author.name ?? author.email),
      raw.actor,
      raw.authorName,
      raw.createdBy,
      "Support",
    ),
  };
}

export function normalizeTicket(
  raw: Record<string, unknown>,
  index: number,
): SupportTicket {
  const id = pickStr(raw.id, raw.uuid, raw.ticketId) || `crm-tk-${index}`;
  const ticketId = pickStr(raw.ticketNumber, raw.ref, raw.code, raw.ticketId);
  const notesFromTicket = extractRecords(raw.notes).map((row, i) =>
    normalizeTicketNote(row, i, "internal"),
  );
  const repliesFromTicket = extractRecords(raw.replies).map((row, i) =>
    normalizeTicketNote(row, i, "public"),
  );
  return {
    id,
    ticketId: ticketId && ticketId !== id ? ticketId : ticketId || `TKT-${index + 1}`,
    subject: pickStr(raw.subject, raw.title, raw.name, "Untitled ticket"),
    requester: pickStr(
      raw.requesterName,
      raw.requester,
      raw.customerName,
      raw.email,
      "Unknown",
    ),
    relatedAccount: pickStr(raw.accountName, raw.relatedAccount, raw.company) || undefined,
    priority: mapTicketPriority(pickStr(raw.priority, "MEDIUM")),
    status: mapTicketStatus(pickStr(raw.status, raw.state, "NEW")),
    category: mapTicketCategory(pickStr(raw.category, raw.type)),
    assignedTo: pickStr(raw.assigneeName, raw.assignedTo, raw.owner) || undefined,
    description: pickStr(raw.description, raw.body, raw.details),
    createdBy: pickStr(raw.createdByName, raw.createdBy, "Support"),
    createdAt: formatWhen(raw.createdAt) || formatTicketDate(),
    modifiedAt: formatWhen(raw.updatedAt ?? raw.modifiedAt) || formatTicketDate(),
    resolvedAt: formatWhen(raw.resolvedAt) || undefined,
    closedAt: formatWhen(raw.closedAt) || undefined,
    mergedIntoId: pickStr(raw.mergedIntoId, raw.survivorId) || undefined,
    mergedIntoRef: pickStr(raw.mergedIntoRef, raw.survivorRef) || undefined,
    notes: [...notesFromTicket, ...repliesFromTicket],
    audit: [],
  };
}

export function normalizeTickets(data: unknown): SupportTicket[] {
  return extractRecords(data).map((row, index) => normalizeTicket(row, index));
}

async function ticketsRequest(suffix: string, init?: RequestInit): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage tickets");
  return crmFetch(auth, ticketsPath(suffix), init);
}

function asTicket(data: unknown): SupportTicket | null {
  const items = normalizeTickets(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeTicket(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmTickets(
  query: CrmTicketQuery = {},
): Promise<SupportTicket[]> {
  return normalizeTickets(
    await ticketsRequest(
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
      }),
    ),
  );
}

export async function getCrmTicket(id: string): Promise<SupportTicket | null> {
  return asTicket(await ticketsRequest(`/${id}`));
}

export function toCreateTicketBody(input: {
  subject: string;
  requester: string;
  relatedAccount?: string;
  priority: TicketPriority;
  status: TicketStatus;
  category?: TicketCategory;
  assignedTo?: string;
  description: string;
}): Record<string, unknown> {
  return {
    subject: input.subject,
    title: input.subject,
    requester: input.requester,
    requesterName: input.requester,
    relatedAccount: input.relatedAccount,
    accountName: input.relatedAccount,
    priority: apiTicketPriority(input.priority),
    status: apiTicketStatus(input.status),
    category: input.category ? apiTicketCategory(input.category) : undefined,
    assignedTo: input.assignedTo,
    assigneeName: input.assignedTo,
    description: input.description,
  };
}

export async function createCrmTicket(
  input: Parameters<typeof toCreateTicketBody>[0],
): Promise<SupportTicket | null> {
  return asTicket(
    await ticketsRequest("", {
      method: "POST",
      body: JSON.stringify(toCreateTicketBody(input)),
    }),
  );
}

export async function updateCrmTicket(
  id: string,
  patch: Partial<SupportTicket>,
): Promise<SupportTicket | null> {
  const body: Record<string, unknown> = {};
  if (patch.subject) body.subject = patch.subject;
  if (patch.priority) body.priority = apiTicketPriority(patch.priority);
  if (patch.status) body.status = apiTicketStatus(patch.status);
  if (patch.category) body.category = apiTicketCategory(patch.category);
  if (patch.assignedTo != null) {
    body.assignedTo = patch.assignedTo;
    body.assigneeName = patch.assignedTo;
  }
  if (patch.description != null) body.description = patch.description;
  if (patch.requester) body.requesterName = patch.requester;
  if (patch.relatedAccount != null) body.relatedAccount = patch.relatedAccount;
  return asTicket(
    await ticketsRequest(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteCrmTicket(id: string): Promise<void> {
  await ticketsRequest(`/${id}`, { method: "DELETE" });
}

export async function listCrmTicketReplies(id: string): Promise<TicketNote[]> {
  return extractRecords(await ticketsRequest(`/${id}/replies`)).map((row, i) =>
    normalizeTicketNote(row, i, "public"),
  );
}

export async function addCrmTicketReply(
  id: string,
  body: string,
): Promise<TicketNote | null> {
  const data = await ticketsRequest(`/${id}/replies`, {
    method: "POST",
    body: JSON.stringify({ body, text: body, content: body }),
  });
  const notes = extractRecords(data).map((row, i) =>
    normalizeTicketNote(row, i, "public"),
  );
  if (notes[0]) return notes[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeTicketNote(data as Record<string, unknown>, 0, "public");
  }
  return null;
}

export async function listCrmTicketNotes(id: string): Promise<TicketNote[]> {
  return extractRecords(await ticketsRequest(`/${id}/notes`)).map((row, i) =>
    normalizeTicketNote(row, i, "internal"),
  );
}

export async function addCrmTicketNote(
  id: string,
  body: string,
): Promise<TicketNote | null> {
  const data = await ticketsRequest(`/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ body, text: body, content: body }),
  });
  const notes = extractRecords(data).map((row, i) =>
    normalizeTicketNote(row, i, "internal"),
  );
  if (notes[0]) return notes[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeTicketNote(data as Record<string, unknown>, 0, "internal");
  }
  return null;
}

export async function mergeCrmTickets(
  sourceId: string,
  targetId: string,
): Promise<SupportTicket | null> {
  return asTicket(
    await ticketsRequest(`/${sourceId}/merge`, {
      method: "POST",
      body: JSON.stringify({
        targetId,
        survivorId: targetId,
        mergeIntoId: targetId,
      }),
    }),
  );
}

export async function suggestCrmTicketReply(id: string): Promise<string> {
  const data = await ticketsRequest(`/${id}/suggest-reply`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    return pickStr(
      rec.suggestion,
      rec.reply,
      rec.body,
      rec.text,
      rec.content,
      rec.message,
    );
  }
  return "";
}

export async function hydrateCrmTicket(id: string): Promise<SupportTicket | null> {
  const ticket = await getCrmTicket(id);
  if (!ticket) return null;
  const [replies, notes] = await Promise.all([
    tryCrmTicket(() => listCrmTicketReplies(id)),
    tryCrmTicket(() => listCrmTicketNotes(id)),
  ]);
  const merged = [
    ...(notes ?? []),
    ...(replies ?? []),
    ...ticket.notes,
  ];
  const seen = new Set<string>();
  ticket.notes = merged.filter((note) => {
    const key = note.id || `${note.kind}:${note.body}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return ticket;
}

export async function tryCrmTicket<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteTicket(row: SupportTicket | null) {
  if (row) upsertTicket(row);
  return row;
}

export function isCrmTicketId(id: string): boolean {
  return isUuid(id);
}
