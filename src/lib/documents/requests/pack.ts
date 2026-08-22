import {
  listDocumentRequests,
  type DocumentRequest,
  type DocumentRequestStatus,
  type RequestMessage,
  type RequestedDocLine,
  type RequestedDocStatus,
  type RequestTimelineEvent,
} from "@/lib/documents/requests/types";
import { listPortals, type ClientPortal } from "@/lib/portals/types";

const fileCache = new Map<
  string,
  { url: string; kind: "pdf" | "image" | "other"; name: string }
>();

export function nowStamp() {
  return new Date().toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function withTime(date: string | undefined, time: string) {
  if (!date) return time;
  if (/\d{1,2}:\d{2}/.test(date)) return date;
  return `${date.replace(/,$/, "")}, ${time}`;
}

function eventSortKey(at: string) {
  const parsed = Date.parse(at);
  if (!Number.isNaN(parsed)) return parsed;
  const slash = at.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    return new Date(
      Number(slash[3]),
      Number(slash[2]) - 1,
      Number(slash[1]),
    ).getTime();
  }
  return 0;
}

const DERIVED_EVENT =
  /invite sent|invitation sent|request created|opened|submitted|uploaded|approved|accepted|rejected|message from client|reply sent|note from client|does not have/i;

export function interactionTimeline(
  req: DocumentRequest,
): RequestTimelineEvent[] {
  const events: RequestTimelineEvent[] = [
    {
      id: `${req.id}-invite`,
      at: withTime(req.requestedDate, "9:00 am"),
      by: req.requestedBy,
      label: "Invite sent",
      detail: `Invitation sent to ${req.requestedFrom}`,
    },
  ];

  const storedOpened = (req.timeline ?? []).find((e) =>
    /opened/i.test(e.label),
  );
  if (storedOpened) {
    events.push({
      ...storedOpened,
      label: "Opened",
      at: withTime(storedOpened.at, "10:14 am"),
    });
  } else if (req.status !== "Requested") {
    events.push({
      id: `${req.id}-opened`,
      at: withTime(req.requestedDate, "10:14 am"),
      by: req.requestedFrom,
      label: "Opened",
      detail: `${req.requestedFrom} opened the invitation`,
    });
  }

  for (const item of requestItems(req)) {
    if (item.uploadedAt && item.fileName) {
      events.push({
        id: `${req.id}-sub-${item.id}`,
        at: withTime(item.uploadedAt, "11:20 am"),
        by: item.uploadedBy ?? req.requestedFrom,
        label: `${item.title} submitted`,
        detail: item.fileName,
      });
    }
    if (item.status === "Accepted" && item.acceptedAt) {
      events.push({
        id: `${req.id}-ok-${item.id}`,
        at: withTime(item.acceptedAt, "2:05 pm"),
        by: req.requestedBy,
        label: `${item.title} approved`,
      });
    }
    if (item.status === "Rejected") {
      events.push({
        id: `${req.id}-no-${item.id}`,
        at: withTime(item.rejectedAt ?? req.lastUpdated, "2:12 pm"),
        by: req.requestedBy,
        label: `${item.title} rejected`,
        detail: item.rejectionReason,
      });
    }
    if (item.status === "Unavailable") {
      events.push({
        id: `${req.id}-na-${item.id}`,
        at: withTime(req.lastUpdated, "1:00 pm"),
        by: req.requestedFrom,
        label: `${item.title} — client does not have this document`,
      });
    }
  }

  for (const message of req.messages ?? []) {
    events.push({
      id: message.id,
      at: withTime(message.at, "3:00 pm"),
      by: message.by,
      label:
        message.from === "client"
          ? "Message from client"
          : "Reply sent to client",
      detail: message.text,
    });
  }

  for (const extra of req.timeline ?? []) {
    if (DERIVED_EVENT.test(extra.label)) continue;
    events.push({
      ...extra,
      at: withTime(extra.at, "4:00 pm"),
    });
  }

  return events.sort((a, b) => eventSortKey(a.at) - eventSortKey(b.at));
}

export function requestItems(req: DocumentRequest): RequestedDocLine[] {
  return req.items ?? [];
}

export function uploadedItems(req: DocumentRequest): RequestedDocLine[] {
  return requestItems(req).filter((item) => Boolean(item.fileName));
}

export const DOC_STATUS_PILL: Record<RequestedDocStatus, string> = {
  Awaiting: "bg-slate-100 text-slate-600",
  Uploaded: "bg-violet-100 text-violet-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
  Unavailable: "bg-amber-100 text-amber-800",
};

export const DOC_STATUS_LABEL: Record<RequestedDocStatus, string> = {
  Awaiting: "Awaiting",
  Uploaded: "Ready for review",
  Accepted: "Accepted",
  Rejected: "Rejected",
  Unavailable: "Client doesn’t have it",
};

export function progressFromItems(items: RequestedDocLine[]): number {
  if (items.length === 0) return 0;
  const done = items.filter(
    (item) => item.status === "Accepted" || item.status === "Unavailable",
  ).length;
  return Math.round((done / items.length) * 100);
}

export function rollupRequestStatus(
  items: RequestedDocLine[],
  fallback: DocumentRequestStatus,
): DocumentRequestStatus {
  if (fallback === "Expired" || fallback === "Rejected") return fallback;
  if (items.length === 0) return fallback;
  const allAccepted = items.every((item) => item.status === "Accepted");
  if (allAccepted) return "Approved";
  if (items.some((item) => item.status === "Uploaded")) return "Received";
  if (
    items.some(
      (item) =>
        item.status === "Rejected" ||
        item.status === "Unavailable" ||
        item.status === "Accepted",
    )
  ) {
    return "Pending";
  }
  return "Requested";
}

export function appendTimeline(
  req: DocumentRequest,
  event: Omit<RequestTimelineEvent, "id">,
): RequestTimelineEvent[] {
  return [
    ...(req.timeline ?? []),
    { ...event, id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
  ];
}

export function appendMessage(
  req: DocumentRequest,
  message: Omit<RequestMessage, "id">,
): RequestMessage[] {
  return [
    ...(req.messages ?? []),
    {
      ...message,
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    },
  ];
}

export function patchItem(
  req: DocumentRequest,
  itemId: string,
  patch: Partial<RequestedDocLine>,
): RequestedDocLine[] {
  return requestItems(req).map((item) =>
    item.id === itemId ? { ...item, ...patch } : item,
  );
}

export function applyItemChange(
  req: DocumentRequest,
  items: RequestedDocLine[],
  extra?: Partial<DocumentRequest>,
): DocumentRequest {
  const status = rollupRequestStatus(items, req.status);
  const firstFile = items.find((item) => item.fileName);
  return {
    ...req,
    ...extra,
    items,
    status,
    progress: progressFromItems(items),
    lastUpdated: nowStamp(),
    receivedFileName: firstFile?.fileName ?? req.receivedFileName,
    receivedDate: firstFile?.uploadedAt ?? req.receivedDate,
  };
}

export function fileCacheKey(requestId: string, itemId: string) {
  return `${requestId}:${itemId}`;
}

export function cacheRequestFile(
  requestId: string,
  itemId: string,
  file: File,
) {
  const key = fileCacheKey(requestId, itemId);
  const prev = fileCache.get(key);
  if (prev) URL.revokeObjectURL(prev.url);
  const url = URL.createObjectURL(file);
  const kind: "pdf" | "image" | "other" = file.type.startsWith("image/")
    ? "image"
    : file.type === "application/pdf"
      ? "pdf"
      : "other";
  const next = { url, kind, name: file.name };
  fileCache.set(key, next);
  return next;
}

export function getCachedRequestFile(requestId: string, itemId: string) {
  return fileCache.get(fileCacheKey(requestId, itemId)) ?? null;
}

export function triggerDownload(name: string, url?: string) {
  const href = url ?? `data:text/plain,${encodeURIComponent(name)}`;
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadRequestFiles(req: DocumentRequest) {
  const files = uploadedItems(req);
  files.forEach((item, i) => {
    const cached = getCachedRequestFile(req.id, item.id);
    window.setTimeout(() => {
      triggerDownload(item.fileName ?? `${item.title}.pdf`, cached?.url);
    }, i * 120);
  });
  return files.length;
}

export function matchPortalForApplicant(name: string, email?: string) {
  const portals = listPortals();
  const n = name.trim().toLowerCase();
  const e = email?.trim().toLowerCase();
  return (
    portals.find((p) => {
      if (e && p.primaryContactEmail.toLowerCase() === e) return true;
      if (p.primaryContactName.toLowerCase() === n) return true;
      if (p.clientName.toLowerCase() === n) return true;
      return false;
    }) ?? null
  );
}

function haystack(req: DocumentRequest) {
  return [
    req.requestedFrom,
    req.relatedTo,
    req.title,
    req.clientName,
    req.clientEmail,
    req.notes,
    ...(req.items ?? []).map((item) => item.applicant ?? ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function documentRequestsForPortal(portal: ClientPortal) {
  const client = portal.clientName.toLowerCase();
  const contact = portal.primaryContactName.toLowerCase();
  const email = portal.primaryContactEmail.toLowerCase();
  return listDocumentRequests().filter((req) => {
    const hay = haystack(req);
    return (
      hay.includes(client) ||
      hay.includes(contact) ||
      hay.includes(email) ||
      req.clientName === portal.clientName ||
      req.clientEmail?.toLowerCase() === email
    );
  });
}
