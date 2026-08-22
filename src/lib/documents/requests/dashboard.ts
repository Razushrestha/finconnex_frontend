import {
  DOCUMENT_REQUEST_STATUS_LABEL,
  DOCUMENT_REQUEST_STATUS_PILL,
  type DocumentRequest,
  type DocumentRequestStatus,
} from "@/lib/documents/requests/types";

export const ACTIVE_DOCUMENT_STATUSES: DocumentRequestStatus[] = [
  "Requested",
  "Pending",
  "Received",
];

export type AttentionFilter =
  | "all"
  | "overdue"
  | "due-today"
  | "due-week"
  | "waiting-client"
  | "with-notes"
  | "pending-overdue"
  | "pending-ontime"
  | "review"
  | "completed"
  | "closed";

export type DocumentSortKey =
  | "updated-desc"
  | "updated-asc"
  | "started-desc"
  | "started-asc"
  | "status-asc"
  | "status-desc"
  | "priority"
  | "progress";

const MONTHS: Record<string, number> = {
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

export function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseDueDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

export function parseDisplayDate(value: string): Date | null {
  const m = value
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2]];
  if (month === undefined) return null;
  return new Date(Number(m[3]), month, Number(m[1]));
}

export function isOpenRequest(r: DocumentRequest) {
  return r.status === "Requested" || r.status === "Pending";
}

export function isReviewRequest(r: DocumentRequest) {
  return r.status === "Received";
}

export function isCompletedRequest(r: DocumentRequest) {
  return r.status === "Approved";
}

export function isClosedRequest(r: DocumentRequest) {
  return r.status === "Rejected" || r.status === "Expired";
}

export function isOverdueRequest(r: DocumentRequest, today = startOfDay()) {
  if (!isOpenRequest(r)) return false;
  const due = parseDueDate(r.dueDate);
  if (!due) return false;
  return startOfDay(due) < today;
}

export function isPendingOnTime(r: DocumentRequest, today = startOfDay()) {
  return isOpenRequest(r) && !isOverdueRequest(r, today);
}

export function displayRequestStatus(
  r: DocumentRequest,
  today = startOfDay(),
) {
  if (isOverdueRequest(r, today)) {
    return { label: "Overdue", pill: "bg-rose-100 text-rose-700" };
  }
  if (isOpenRequest(r)) {
    return { label: "Pending", pill: "bg-amber-100 text-amber-800" };
  }
  if (isReviewRequest(r)) {
    return { label: "Review", pill: "bg-violet-100 text-violet-700" };
  }
  return {
    label: DOCUMENT_REQUEST_STATUS_LABEL[r.status],
    pill: DOCUMENT_REQUEST_STATUS_PILL[r.status],
  };
}

export function daysUntilDue(r: DocumentRequest, today = startOfDay()) {
  const due = parseDueDate(r.dueDate);
  if (!due) return null;
  return Math.round(
    (startOfDay(due).getTime() - today.getTime()) / 86_400_000,
  );
}

export type SlaBand = "on-track" | "at-risk" | "breached";

export function slaBand(r: DocumentRequest, today = startOfDay()): SlaBand {
  if (isClosedRequest(r) || isOverdueRequest(r, today)) return "breached";
  const days = daysUntilDue(r, today);
  if (isOpenRequest(r) && days !== null && days <= 2) return "at-risk";
  return "on-track";
}

export function matchesAttention(
  r: DocumentRequest,
  filter: AttentionFilter,
  today = startOfDay(),
) {
  const days = daysUntilDue(r, today);
  switch (filter) {
    case "overdue":
    case "pending-overdue":
      return isOverdueRequest(r, today);
    case "due-today":
      return isOpenRequest(r) && days === 0;
    case "due-week":
      return isOpenRequest(r) && days !== null && days >= 0 && days <= 7;
    case "waiting-client":
      return isOpenRequest(r);
    case "with-notes":
      return Boolean(r.notes?.trim());
    case "pending-ontime":
      return isPendingOnTime(r, today);
    case "review":
      return isReviewRequest(r);
    case "completed":
      return isCompletedRequest(r);
    case "closed":
      return isClosedRequest(r);
    default:
      return true;
  }
}

export type DocumentStatusFilter =
  | "All"
  | "overdue"
  | "pending"
  | "review"
  | "completed"
  | "closed";

export const DOCUMENT_DISPLAY_STATUS_FILTERS: {
  value: DocumentStatusFilter;
  label: string;
}[] = [
  { value: "All", label: "All statuses" },
  { value: "overdue", label: "Overdue" },
  { value: "pending", label: "Pending" },
  { value: "review", label: "Review" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Cancelled / Closed" },
];

const STATUS_FILTER_ATTENTION: Record<
  Exclude<DocumentStatusFilter, "All">,
  AttentionFilter
> = {
  overdue: "pending-overdue",
  pending: "pending-ontime",
  review: "review",
  completed: "completed",
  closed: "closed",
};

export function filterDocumentRequests(
  rows: DocumentRequest[],
  {
    statusFilter = "All",
    requestedBy = "All",
    attention = "all",
    search = "",
    sort = "updated-desc",
  }: {
    statusFilter?: DocumentStatusFilter;
    requestedBy?: string;
    attention?: AttentionFilter;
    search?: string;
    sort?: DocumentSortKey;
  } = {},
) {
  let data = rows;
  if (statusFilter !== "All") {
    data = data.filter((r) =>
      matchesAttention(r, STATUS_FILTER_ATTENTION[statusFilter]),
    );
  }
  if (requestedBy !== "All") {
    data = data.filter((r) => r.requestedBy === requestedBy);
  }
  if (attention !== "all") {
    data = data.filter((r) => matchesAttention(r, attention));
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    data = data.filter(
      (r) =>
        r.requestedFrom.toLowerCase().includes(q) ||
        r.requestId.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q) ||
        (r.relatedTo ?? "").toLowerCase().includes(q),
    );
  }
  return sortDocumentRequests(data, sort);
}

export function exportDocumentRequestsCsv(rows: DocumentRequest[]) {
  const header = [
    "Applicant",
    "Requested by",
    "Request ID",
    "Priority",
    "Start date",
    "Last updated",
    "Status",
    "Progress",
    "Due date",
  ];
  const lines = rows.map((r) =>
    [
      r.requestedFrom,
      r.requestedBy,
      r.requestId,
      r.priority ?? "Normal",
      r.requestedDate,
      r.lastUpdated,
      displayRequestStatus(r).label,
      `${r.progress}%`,
      r.dueDate,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "document-requests.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_SORT_RANK: Record<DocumentRequestStatus, number> = {
  Requested: 0,
  Pending: 1,
  Received: 2,
  Approved: 3,
  Rejected: 4,
  Expired: 5,
};

export function nextDocumentSort(
  current: DocumentSortKey,
  column: "started" | "updated" | "status",
): DocumentSortKey {
  if (column === "started") {
    return current === "started-desc" ? "started-asc" : "started-desc";
  }
  if (column === "updated") {
    return current === "updated-desc" ? "updated-asc" : "updated-desc";
  }
  return current === "status-asc" ? "status-desc" : "status-asc";
}

export function sortDocumentRequests(
  rows: DocumentRequest[],
  sort: DocumentSortKey,
) {
  const copy = [...rows];
  const time = (label: string) => parseDisplayDate(label)?.getTime() ?? 0;
  const rank = { High: 0, Normal: 1, Low: 2 } as const;
  copy.sort((a, b) => {
    if (sort === "updated-desc") return time(b.lastUpdated) - time(a.lastUpdated);
    if (sort === "updated-asc") return time(a.lastUpdated) - time(b.lastUpdated);
    if (sort === "started-desc")
      return time(b.requestedDate) - time(a.requestedDate);
    if (sort === "started-asc")
      return time(a.requestedDate) - time(b.requestedDate);
    if (sort === "status-asc")
      return STATUS_SORT_RANK[a.status] - STATUS_SORT_RANK[b.status];
    if (sort === "status-desc")
      return STATUS_SORT_RANK[b.status] - STATUS_SORT_RANK[a.status];
    if (sort === "priority")
      return rank[a.priority ?? "Normal"] - rank[b.priority ?? "Normal"];
    return b.progress - a.progress;
  });
  return copy;
}

export function kpiTrend(
  rows: DocumentRequest[],
  predicate: (r: DocumentRequest) => boolean,
  today = startOfDay(),
) {
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const inRange = (r: DocumentRequest, from: Date, to: Date) => {
    const d = parseDisplayDate(r.requestedDate);
    if (!d) return false;
    const t = startOfDay(d).getTime();
    return t >= from.getTime() && t <= to.getTime();
  };

  const current = rows.filter(
    (r) => predicate(r) && inRange(r, thisMonthStart, today),
  ).length;
  const previous = rows.filter(
    (r) => predicate(r) && inRange(r, lastMonthStart, lastMonthEnd),
  ).length;
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildKpis(rows: DocumentRequest[], today = startOfDay()) {
  const total = rows.length;
  const overdue = rows.filter((r) => isOverdueRequest(r, today));
  const onTime = rows.filter((r) => isPendingOnTime(r, today));
  const review = rows.filter(isReviewRequest);
  const completed = rows.filter(isCompletedRequest);
  const closed = rows.filter(isClosedRequest);
  return {
    total,
    overdue: overdue.length,
    onTime: onTime.length,
    review: review.length,
    completed: completed.length,
    closed: closed.length,
    trends: {
      total: kpiTrend(rows, () => true, today),
      overdue: kpiTrend(rows, (r) => isOverdueRequest(r, today), today),
      onTime: kpiTrend(rows, (r) => isPendingOnTime(r, today), today),
      review: kpiTrend(rows, isReviewRequest, today),
      completed: kpiTrend(rows, isCompletedRequest, today),
      closed: kpiTrend(rows, isClosedRequest, today),
    },
  };
}

export function buildTeamWorkload(
  rows: DocumentRequest[],
  today = startOfDay(),
) {
  const map = new Map<
    string,
    { name: string; overdue: number; pending: number }
  >();
  for (const row of rows) {
    const name = row.requestedBy.trim() || "Unassigned";
    const current = map.get(name) ?? { name, overdue: 0, pending: 0 };
    if (isOverdueRequest(row, today)) current.overdue += 1;
    else if (
      row.status === "Requested" ||
      row.status === "Pending" ||
      row.status === "Received"
    ) {
      current.pending += 1;
    }
    map.set(name, current);
  }
  return [...map.values()]
    .filter((row) => row.overdue > 0 || row.pending > 0)
    .sort((a, b) => b.overdue - a.overdue || b.pending - a.pending)
    .slice(0, 6);
}

export function buildNeedsAttention(
  rows: DocumentRequest[],
  today = startOfDay(),
) {
  return [
    {
      id: "overdue" as const,
      label: "Overdue Requests",
      count: rows.filter((r) => isOverdueRequest(r, today)).length,
    },
    {
      id: "due-today" as const,
      label: "Due Today",
      count: rows.filter((r) => isOpenRequest(r) && daysUntilDue(r, today) === 0)
        .length,
    },
    {
      id: "due-week" as const,
      label: "Due This Week",
      count: rows.filter((r) => {
        const days = daysUntilDue(r, today);
        return isOpenRequest(r) && days !== null && days >= 0 && days <= 7;
      }).length,
    },
    {
      id: "waiting-client" as const,
      label: "Waiting on Client",
      count: rows.filter(isOpenRequest).length,
    },
    {
      id: "review" as const,
      label: "In Review",
      count: rows.filter(isReviewRequest).length,
    },
    {
      id: "with-notes" as const,
      label: "Requests with Notes",
      count: rows.filter((r) => r.notes?.trim()).length,
    },
  ];
}

export function buildStatusSlices(rows: DocumentRequest[], today = startOfDay()) {
  const slices = [
    {
      key: "pending-ontime",
      name: "Pending",
      value: rows.filter((r) => isPendingOnTime(r, today)).length,
      fill: "#6366F1",
    },
    {
      key: "pending-overdue",
      name: "Overdue",
      value: rows.filter((r) => isOverdueRequest(r, today)).length,
      fill: "#F43F5E",
    },
    {
      key: "review",
      name: "Review",
      value: rows.filter(isReviewRequest).length,
      fill: "#7C3AED",
    },
    {
      key: "completed",
      name: "Completed",
      value: rows.filter(isCompletedRequest).length,
      fill: "#10B981",
    },
    {
      key: "closed",
      name: "Cancelled / Closed",
      value: rows.filter(isClosedRequest).length,
      fill: "#94A3B8",
    },
  ];
  const total = slices.reduce((n, s) => n + s.value, 0) || 1;
  return slices.map((s) => ({
    ...s,
    pct: Math.round((s.value / total) * 100),
  }));
}

export function buildTimeSeries(
  rows: DocumentRequest[],
  mode: "daily" | "weekly",
  today = startOfDay(),
) {
  const points = mode === "daily" ? 7 : 6;
  const step = mode === "daily" ? 1 : 7;
  const series: {
    label: string;
    requested: number;
    completed: number;
    overdue: number;
  }[] = [];

  for (let i = points - 1; i >= 0; i--) {
    const end = new Date(today);
    end.setDate(today.getDate() - i * step);
    const start = new Date(end);
    if (mode === "weekly") start.setDate(end.getDate() - 6);

    const label =
      mode === "daily"
        ? end.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
        : `W${points - i}`;

    const inBucket = (d: Date | null) => {
      if (!d) return false;
      const t = startOfDay(d).getTime();
      return t >= startOfDay(start).getTime() && t <= startOfDay(end).getTime();
    };

    series.push({
      label,
      requested: rows.filter((r) => inBucket(parseDisplayDate(r.requestedDate)))
        .length,
      completed: rows.filter(
        (r) =>
          isCompletedRequest(r) &&
          inBucket(parseDisplayDate(r.receivedDate || r.lastUpdated)),
      ).length,
      overdue: rows.filter((r) => {
        const due = parseDueDate(r.dueDate);
        return isOverdueRequest(r, end) && due !== null && inBucket(due);
      }).length,
    });
  }

  return series;
}

export function buildSla(rows: DocumentRequest[], today = startOfDay()) {
  const bands = {
    "on-track": rows.filter((r) => slaBand(r, today) === "on-track").length,
    "at-risk": rows.filter((r) => slaBand(r, today) === "at-risk").length,
    breached: rows.filter((r) => slaBand(r, today) === "breached").length,
  };
  const total = rows.length || 1;
  return {
    ...bands,
    onTrackPct: Math.round((bands["on-track"] / total) * 100),
  };
}

export function buildTurnaround(rows: DocumentRequest[], today = startOfDay()) {
  const completed = rows.filter(isCompletedRequest);
  const durations = completed
    .map((r) => {
      const start = parseDisplayDate(r.requestedDate);
      const end = parseDisplayDate(r.receivedDate || r.lastUpdated);
      if (!start || !end) return null;
      return Math.max(
        0,
        Math.round((end.getTime() - start.getTime()) / 86_400_000),
      );
    })
    .filter((n): n is number => n !== null);

  const avg =
    durations.length === 0
      ? 0
      : Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) /
        10;

  const spark = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - i));
    const values = completed
      .filter((r) => {
        const end = parseDisplayDate(r.receivedDate || r.lastUpdated);
        return end && startOfDay(end).getTime() === startOfDay(day).getTime();
      })
      .map((r) => {
        const start = parseDisplayDate(r.requestedDate);
        const end = parseDisplayDate(r.receivedDate || r.lastUpdated);
        if (!start || !end) return 0;
        return Math.max(0, (end.getTime() - start.getTime()) / 86_400_000);
      });
    return {
      label: day.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
      value:
        values.length === 0
          ? avg
          : Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) /
            10,
    };
  });

  const prevAvg =
    spark.slice(0, 3).reduce((n, p) => n + p.value, 0) / 3 || avg;
  const delta = Math.round((avg - prevAvg) * 10) / 10;

  return { avg, delta, spark };
}
