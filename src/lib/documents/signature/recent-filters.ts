import { endOfDay, parseFlexibleDate, startOfDay } from "@/lib/leads/activity-dates";
import {
  computeOverallStatus,
  type SignatureRequest,
} from "@/lib/documents/signature/types";

export const RECENT_DOC_STATUSES = [
  "Draft",
  "In Progress",
  "Signed",
  "Expired",
] as const;

export type RecentDocStatus = (typeof RECENT_DOC_STATUSES)[number];

export const RECENT_DOC_DATE_FIELDS = [
  { value: "sent", label: "Sent date" },
  { value: "created", label: "Created date" },
  { value: "activity", label: "Last activity date" },
  { value: "signed", label: "Signed date" },
] as const;

export type RecentDocDateField = (typeof RECENT_DOC_DATE_FIELDS)[number]["value"];

export const RECENT_DOC_DATE_RANGES = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "thisWeek", label: "This week" },
  { value: "lastWeek", label: "Last week" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom date range" },
] as const;

export type RecentDocDateRange = (typeof RECENT_DOC_DATE_RANGES)[number]["value"];

export const RECENT_DOC_SORTS = [
  { value: "activity-desc", label: "Last activity, newest" },
  { value: "activity-asc", label: "Last activity, oldest" },
  { value: "sent-desc", label: "Sent date, newest" },
  { value: "sent-asc", label: "Sent date, oldest" },
  { value: "created-desc", label: "Created date, newest" },
  { value: "created-asc", label: "Created date, oldest" },
  { value: "signed-desc", label: "Signed date, newest" },
  { value: "signed-asc", label: "Signed date, oldest" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
] as const;

export type RecentDocSort = (typeof RECENT_DOC_SORTS)[number]["value"];

export type RecentDocFilters = {
  statuses: RecentDocStatus[];
  owners: string[];
  dateField: RecentDocDateField;
  dateRange: RecentDocDateRange;
  customFrom: string;
  customTo: string;
};

export const EMPTY_RECENT_DOC_FILTERS: RecentDocFilters = {
  statuses: [],
  owners: [],
  dateField: "activity",
  dateRange: "all",
  customFrom: "",
  customTo: "",
};

function documentCreatedAt(doc: SignatureRequest): Date | null {
  const stamps = (doc.audit ?? [])
    .map((event) => parseFlexibleDate(event.at))
    .filter((value): value is Date => Boolean(value));
  if (stamps.length) {
    return stamps.reduce((earliest, next) =>
      next.getTime() < earliest.getTime() ? next : earliest,
    );
  }
  return parseFlexibleDate(doc.updatedAt);
}

function documentActivityAt(doc: SignatureRequest): Date | null {
  const auditAt = doc.audit?.length
    ? doc.audit[doc.audit.length - 1]?.at
    : undefined;
  return parseFlexibleDate(
    doc.updatedAt || auditAt || doc.sentAt || doc.sentDate || doc.signedDate,
  );
}

export function recentDocumentDate(
  doc: SignatureRequest,
  field: RecentDocDateField,
): Date | null {
  if (field === "sent") return parseFlexibleDate(doc.sentAt || doc.sentDate);
  if (field === "signed") return parseFlexibleDate(doc.signedDate);
  if (field === "created") return documentCreatedAt(doc);
  return documentActivityAt(doc);
}

function matchesStatus(doc: SignatureRequest, statuses: RecentDocStatus[]) {
  if (!statuses.length) return true;
  const overall = computeOverallStatus(doc);
  return statuses.some((status) => {
    if (status === "In Progress") {
      return overall === "Sent" || overall === "Viewed";
    }
    return overall === status;
  });
}

function dateWindow(
  filters: RecentDocFilters,
  now = new Date(),
): { start: Date | null; end: Date | null } {
  const today = startOfDay(now);
  const endToday = endOfDay(now);

  if (filters.dateRange === "all") return { start: null, end: null };
  if (filters.dateRange === "today") return { start: today, end: endToday };
  if (filters.dateRange === "yesterday") {
    const day = new Date(today);
    day.setDate(day.getDate() - 1);
    return { start: day, end: endOfDay(day) };
  }
  if (filters.dateRange === "7d" || filters.dateRange === "30d") {
    const start = new Date(today);
    start.setDate(start.getDate() - (filters.dateRange === "7d" ? 6 : 29));
    return { start, end: endToday };
  }
  if (filters.dateRange === "thisWeek" || filters.dateRange === "lastWeek") {
    const weekday = today.getDay();
    const sinceMonday = weekday === 0 ? 6 : weekday - 1;
    const monday = new Date(today);
    monday.setDate(monday.getDate() - sinceMonday);
    if (filters.dateRange === "thisWeek") return { start: monday, end: endToday };
    const start = new Date(monday);
    start.setDate(start.getDate() - 7);
    const end = new Date(monday);
    end.setDate(end.getDate() - 1);
    return { start, end: endOfDay(end) };
  }
  if (filters.dateRange === "thisMonth") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endToday };
  }
  if (filters.dateRange === "lastMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start, end: endOfDay(end) };
  }
  if (filters.dateRange === "thisYear") {
    return { start: new Date(now.getFullYear(), 0, 1), end: endToday };
  }

  const start = inputDate(filters.customFrom, false);
  const end = inputDate(filters.customTo, true);
  return { start, end };
}

function inputDate(value: string, end: boolean): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  return end
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day);
}

function inWindow(at: Date | null, start: Date | null, end: Date | null) {
  if (!start && !end) return true;
  if (!at) return false;
  if (start && at.getTime() < start.getTime()) return false;
  if (end && at.getTime() > end.getTime()) return false;
  return true;
}

function matchesQuery(doc: SignatureRequest, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const recipients = doc.signers
    .flatMap((signer) => [signer.name, signer.email])
    .join(" ");
  const haystack = [
    doc.documentName,
    doc.signatureRequestId,
    doc.signer,
    doc.signerEmail,
    recipients,
    doc.createdBy,
    doc.relatedTo,
    doc.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function sortValue(doc: SignatureRequest, sort: RecentDocSort): number | string {
  if (sort.startsWith("name")) return doc.documentName.trim().toLowerCase();
  const field: RecentDocDateField = sort.startsWith("sent")
    ? "sent"
    : sort.startsWith("created")
      ? "created"
      : sort.startsWith("signed")
        ? "signed"
        : "activity";
  return recentDocumentDate(doc, field)?.getTime() ?? Number.NaN;
}

export function filterRecentDocuments(
  docs: SignatureRequest[],
  input: { query: string; sort: RecentDocSort; filters: RecentDocFilters },
): SignatureRequest[] {
  const window = dateWindow(input.filters);
  const filtered = docs.filter((doc) => {
    if (!matchesQuery(doc, input.query)) return false;
    if (!matchesStatus(doc, input.filters.statuses)) return false;
    if (input.filters.owners.length) {
      const owner = doc.createdBy.trim().toLowerCase();
      const selected = input.filters.owners.some(
        (name) => name.trim().toLowerCase() === owner,
      );
      if (!selected) return false;
    }
    return inWindow(
      recentDocumentDate(doc, input.filters.dateField),
      window.start,
      window.end,
    );
  });

  const direction = input.sort.endsWith("asc") ? 1 : -1;
  return [...filtered].sort((a, b) => {
    const left = sortValue(a, input.sort);
    const right = sortValue(b, input.sort);
    if (typeof left === "string" && typeof right === "string") {
      return left.localeCompare(right) * direction;
    }
    const leftMissing = typeof left !== "number" || Number.isNaN(left);
    const rightMissing = typeof right !== "number" || Number.isNaN(right);
    if (leftMissing && rightMissing) return 0;
    if (leftMissing) return 1;
    if (rightMissing) return -1;
    return ((left as number) - (right as number)) * direction;
  });
}

export function recentFilterCount(filters: RecentDocFilters) {
  let count = 0;
  if (filters.statuses.length) count += 1;
  if (filters.owners.length) count += 1;
  if (filters.dateRange !== "all") count += 1;
  return count;
}
