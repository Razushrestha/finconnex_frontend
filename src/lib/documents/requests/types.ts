/** SRS §9.2 Document Requests */

import {
  readJsonArrayStore,
  writeJsonArrayStore,
} from "@/lib/browser-json-store";

export type DocumentRequestType =
  | "Contract"
  | "Proposal"
  | "ID Proof"
  | "Financial"
  | "Legal"
  | "Other"
  | "Refinance"
  | "Property purchase";

export type DocumentRequestStatus =
  | "Requested"
  | "Pending"
  | "Received"
  | "Approved"
  | "Rejected"
  | "Expired";

export type RequestedDocStatus =
  | "Awaiting"
  | "Uploaded"
  | "Accepted"
  | "Rejected"
  | "Unavailable";

export interface RequestedDocLine {
  id: string;
  catalogId?: string;
  title: string;
  description?: string;
  applicant?: string;
  status: RequestedDocStatus;
  fileName?: string;
  fileKind?: "pdf" | "image" | "other";
  uploadedAt?: string;
  uploadedBy?: string;
  source?: "portal" | "whatsapp" | "manual";
  rejectionReason?: string;
  rejectedAt?: string;
  acceptedAt?: string;
}

export interface RequestTimelineEvent {
  id: string;
  at: string;
  by: string;
  label: string;
  detail?: string;
}

export interface RequestMessage {
  id: string;
  at: string;
  by: string;
  from: "team" | "client";
  text: string;
  documentId?: string;
}

export type DocumentRequestPriority = "High" | "Normal" | "Low";

export const DOCUMENT_REQUEST_PRIORITIES: DocumentRequestPriority[] = [
  "High",
  "Normal",
  "Low",
];

export const DOCUMENT_REQUEST_TYPES: DocumentRequestType[] = [
  "Contract",
  "Proposal",
  "ID Proof",
  "Financial",
  "Legal",
  "Other",
  "Refinance",
  "Property purchase",
];

export const DOCUMENT_REQUEST_STATUSES: DocumentRequestStatus[] = [
  "Requested",
  "Pending",
  "Received",
  "Approved",
  "Rejected",
  "Expired",
];

/** UI labels matching Discovery Journeys status pills */
export const DOCUMENT_REQUEST_STATUS_LABEL: Record<DocumentRequestStatus, string> =
  {
    Requested: "Invite sent",
    Pending: "In progress",
    Received: "Review",
    Approved: "Completed",
    Rejected: "Rejected",
    Expired: "Cancelled / Closed",
  };

export const DOCUMENT_REQUEST_STATUS_PILL: Record<DocumentRequestStatus, string> =
  {
    Requested: "bg-sky-100 text-sky-700",
    Pending: "bg-amber-100 text-amber-800",
    Received: "bg-violet-100 text-violet-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-rose-100 text-rose-700",
    Expired: "bg-slate-100 text-slate-600",
  };

export const DOCUMENT_REQUEST_BROKERS: readonly string[] = [];

export interface DocumentRequest {
  id: string;
  requestId: string;
  title: string;
  /** Applicant / client name(s) — comma-separated for joint apps */
  requestedFrom: string;
  relatedTo?: string;
  documentType: DocumentRequestType;
  status: DocumentRequestStatus;
  dueDate: string;
  reminderDate?: string;
  repeat?: string;
  notifyBy?: string[];
  /** Broker / owner */
  requestedBy: string;
  /** Start / invite date (display e.g. 20 Aug, 2026) */
  requestedDate: string;
  lastUpdated: string;
  /** 0–100 completion of the document pack */
  progress: number;
  priority?: DocumentRequestPriority;
  receivedDate?: string;
  notes?: string;
  receivedFileName?: string;
  items?: RequestedDocLine[];
  timeline?: RequestTimelineEvent[];
  messages?: RequestMessage[];
  internalNotes?: string;
  clientName?: string;
  clientEmail?: string;
}

export interface DocumentRequestColumn {
  id: string;
  title: DocumentRequestStatus;
  count: number;
  badgeColorClass: string;
  requests: DocumentRequest[];
}

export function progressForStatus(status: DocumentRequestStatus): number {
  switch (status) {
    case "Requested":
      return 0;
    case "Pending":
      return 32;
    case "Received":
      return 86;
    case "Approved":
      return 100;
    case "Rejected":
      return 45;
    case "Expired":
      return 0;
    default:
      return 0;
  }
}

export const documentRequests: DocumentRequest[] = [];

const COLUMN_COLORS: Record<DocumentRequestStatus, string> = {
  Requested: "bg-sky-500 text-white",
  Pending: "bg-amber-500 text-white",
  Received: "bg-violet-500 text-white",
  Approved: "bg-emerald-500 text-white",
  Rejected: "bg-rose-500 text-white",
  Expired: "bg-slate-400 text-white",
};

const STORE_KEY = "documents:requests:v3";

export function buildDocumentRequestColumns(
  list: DocumentRequest[],
): DocumentRequestColumn[] {
  return DOCUMENT_REQUEST_STATUSES.map((status) => {
    const items = list.filter((r) => r.status === status);
    return {
      id: status.toLowerCase(),
      title: status,
      count: items.length,
      badgeColorClass: COLUMN_COLORS[status],
      requests: items,
    };
  });
}

export const documentRequestColumns: DocumentRequestColumn[] =
  buildDocumentRequestColumns(documentRequests);

function deriveItems(req: DocumentRequest): RequestedDocLine[] {
  if (req.items && req.items.length > 0) return req.items;
  const status: RequestedDocStatus =
    req.status === "Approved"
      ? "Accepted"
      : req.status === "Rejected"
        ? "Rejected"
        : req.receivedFileName
          ? "Uploaded"
          : "Awaiting";
  return [
    {
      id: `${req.id}-doc-1`,
      title: req.title || req.documentType,
      status,
      fileName: req.receivedFileName,
      fileKind: req.receivedFileName ? "pdf" : undefined,
      uploadedAt: req.receivedDate,
      uploadedBy: req.receivedFileName ? req.requestedFrom : undefined,
      source: req.receivedFileName ? "portal" : undefined,
      acceptedAt: req.status === "Approved" ? req.receivedDate : undefined,
      rejectedAt: req.status === "Rejected" ? req.lastUpdated : undefined,
      rejectionReason:
        req.status === "Rejected"
          ? req.notes || "Please upload a clearer copy."
          : undefined,
    },
  ];
}

function deriveTimeline(req: DocumentRequest): RequestTimelineEvent[] {
  if (req.timeline && req.timeline.length > 0) return req.timeline;
  const events: RequestTimelineEvent[] = [
    {
      id: `${req.id}-t-created`,
      at: req.requestedDate,
      by: req.requestedBy,
      label: "Request created",
      detail: `Invitation sent to ${req.requestedFrom}`,
    },
  ];
  for (const item of req.items ?? []) {
    if (item.uploadedAt && item.fileName) {
      events.push({
        id: `${req.id}-t-up-${item.id}`,
        at: item.uploadedAt,
        by: item.uploadedBy ?? req.requestedFrom,
        label: `${item.title} uploaded`,
        detail: item.fileName,
      });
    }
    if (item.status === "Accepted" && item.acceptedAt) {
      events.push({
        id: `${req.id}-t-ok-${item.id}`,
        at: item.acceptedAt,
        by: req.requestedBy,
        label: `${item.title} accepted`,
      });
    }
    if (item.status === "Rejected" && item.rejectedAt) {
      events.push({
        id: `${req.id}-t-no-${item.id}`,
        at: item.rejectedAt,
        by: req.requestedBy,
        label: `${item.title} rejected`,
        detail: item.rejectionReason,
      });
    }
    if (item.status === "Unavailable") {
      events.push({
        id: `${req.id}-t-na-${item.id}`,
        at: req.lastUpdated,
        by: req.requestedFrom,
        label: `${item.title} marked as not available`,
      });
    }
  }
  return events;
}

function normalize(req: DocumentRequest): DocumentRequest {
  const items = deriveItems(req);
  const withItems = { ...req, items };
  return {
    ...withItems,
    lastUpdated: req.lastUpdated || req.requestedDate,
    progress:
      typeof req.progress === "number"
        ? req.progress
        : progressForStatus(req.status),
    priority: req.priority ?? "Normal",
    items,
    timeline: deriveTimeline(withItems),
    messages: req.messages ?? [],
    internalNotes: req.internalNotes ?? "",
  };
}

function readStore(): DocumentRequest[] | null {
  const parsed = readJsonArrayStore<DocumentRequest>(STORE_KEY);
  return parsed ? parsed.map(normalize) : null;
}

function writeStore(list: DocumentRequest[]) {
  writeJsonArrayStore(STORE_KEY, list.map(normalize));
}

export function listDocumentRequests(): DocumentRequest[] {
  return (readStore() ?? documentRequests.map((r) => ({ ...r }))).map(
    normalize,
  );
}

export function upsertDocumentRequest(req: DocumentRequest) {
  const list = listDocumentRequests();
  const next = normalize(req);
  const i = list.findIndex((r) => r.id === next.id);
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  writeStore(list);
  return next;
}

export function replaceDocumentRequests(list: DocumentRequest[]) {
  writeStore(list.map(normalize));
}

export function removeDocumentRequest(id: string): DocumentRequest | null {
  const list = listDocumentRequests();
  const found = list.find((r) => r.id === id) ?? null;
  if (!found) return null;
  writeStore(list.filter((r) => r.id !== id));
  return found;
}

export function getDocumentRequestById(id: string) {
  return listDocumentRequests().find((r) => r.id === id);
}

export function nextDocumentRequestIds() {
  const list = listDocumentRequests();
  const nums = list
    .map((r) => Number(r.requestId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 1000) + 1;
  return {
    id: `dr-${Date.now()}`,
    requestId: `DR-${n}`,
  };
}

export function formatRelativeFromDisplay(dateLabel: string): string | null {
  const match = dateLabel
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})$/);
  if (!match) return null;
  const months: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const month = months[match[2]];
  if (month === undefined) return null;
  const then = new Date(Number(match[3]), month, Number(match[1]));
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThen = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate(),
  );
  const diffDays = Math.round(
    (startToday.getTime() - startThen.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays > 1 && diffDays < 60) return `${diffDays} days ago`;
  return null;
}
