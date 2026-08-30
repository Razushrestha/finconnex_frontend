/** SRS §9.2 Document Requests */

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

export const DOCUMENT_REQUEST_BROKERS = [
  "John Smith",
  "Bishnu Acharya",
  "Shiva Kadhka",
  "Tejas Gokhe",
  "Roshna Abraham",
] as const;

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

const EXTRA_APPLICANTS = [
  "Ava Chen",
  "Liam Patel",
  "Sofia Rossi",
  "Noah Williams",
  "Mia Thompson",
  "Ethan Brooks",
  "Harper Quinn",
  "Lucas Nguyen",
  "Isla Kapoor",
  "Jack Reynolds",
  "Zara Ahmed",
  "Owen Fraser",
  "Emily Walsh",
  "Leo Santos",
  "Grace Kim",
  "Henry Clarke",
  "Ruby Singh",
  "Felix Moreau",
  "Chloe Park",
  "Daniel Costa",
];

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/ (\d{4})$/, ", $1");
}

function formatDueDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function buildExtraDocumentRequests(): DocumentRequest[] {
  const types = DOCUMENT_REQUEST_TYPES;
  const brokers = DOCUMENT_REQUEST_BROKERS;
  const today = new Date(2026, 7, 22);
  const extras: DocumentRequest[] = [];

  for (let i = 0; i < 118; i++) {
    const applicant = EXTRA_APPLICANTS[i % EXTRA_APPLICANTS.length]!;
    const joint =
      i % 11 === 0 ? `${applicant}, ${EXTRA_APPLICANTS[(i + 3) % EXTRA_APPLICANTS.length]}` : applicant;
    const bucket = i % 20;
    let status: DocumentRequestStatus = "Pending";
    let progress = 32;
    let priority: DocumentRequestPriority = "Normal";
    const start = new Date(today);
    start.setDate(today.getDate() - (i % 28) - 1);
    const due = new Date(today);
    const updated = new Date(start);
    updated.setDate(start.getDate() + Math.min(6, (i % 5) + 1));

    if (bucket < 4) {
      status = "Requested";
      progress = 0;
      due.setDate(today.getDate() + (i % 8) + 1);
    } else if (bucket < 8) {
      status = "Pending";
      progress = 12 + (i % 5) * 10;
      due.setDate(today.getDate() - ((i % 6) + 1));
      priority = i % 3 === 0 ? "High" : "Normal";
    } else if (bucket < 14) {
      status = "Pending";
      progress = 20 + (i % 6) * 8;
      due.setDate(today.getDate() + (i % 10) + 1);
    } else if (bucket < 18) {
      status = i % 2 === 0 ? "Received" : "Approved";
      progress = status === "Approved" ? 100 : 78 + (i % 3) * 4;
      due.setDate(start.getDate() + 8);
      updated.setTime(due.getTime());
    } else {
      status = i % 2 === 0 ? "Rejected" : "Expired";
      progress = status === "Rejected" ? 40 : 0;
      due.setDate(today.getDate() - 10);
      priority = "Low";
    }

    extras.push({
      id: `dr-x${i + 1}`,
      requestId: `${i % 2 === 0 ? "BR" : "BN"}-${80000000 + i}`,
      title: `${types[i % types.length]} pack — ${applicant}`,
      requestedFrom: joint,
      relatedTo: `Lead: ${applicant}`,
      documentType: types[i % types.length]!,
      status,
      dueDate: formatDueDate(due),
      requestedBy: brokers[i % brokers.length]!,
      requestedDate: formatDisplayDate(start),
      lastUpdated: formatDisplayDate(updated > today ? today : updated),
      progress,
      priority,
      notes: i % 7 === 0 ? "Follow up logged from broker call." : undefined,
      receivedDate:
        status === "Received" || status === "Approved"
          ? formatDueDate(updated)
          : undefined,
    });
  }

  return extras;
}

export const documentRequests: DocumentRequest[] = [
  {
    id: "dr1",
    requestId: "BR-23885495",
    title: "ID + income proof for pre-approval",
    requestedFrom: "Razu Shrestha",
    relatedTo: "Lead: Razu Shrestha",
    documentType: "Refinance",
    status: "Requested",
    dueDate: "25/07/2026",
    requestedBy: "Bishnu Acharya",
    requestedDate: "20 Aug, 2026",
    lastUpdated: "20 Aug, 2026",
    progress: 0,
    priority: "Normal",
    notes: "Need passport or driver licence + last 2 payslips.",
  },
  {
    id: "dr2",
    requestId: "BN-89970560",
    title: "Bank statements: last 3 months",
    requestedFrom: "Oliver Moodie, Ashika Devi",
    relatedTo: "Lead: Oliver Moodie",
    documentType: "Property purchase",
    status: "Pending",
    dueDate: "22/07/2026",
    requestedBy: "John Smith",
    requestedDate: "18 Aug, 2026",
    lastUpdated: "19 Aug, 2026",
    progress: 32,
    priority: "High",
    reminderDate: "21 Aug 2026, 9:00 am",
    repeat: "Custom · every 2 days · start 2 days after request · stop on due date",
    notifyBy: ["Email"],
    notes: "Client said they will upload by Friday.",
    items: [
      {
        id: "dr2-doc-1",
        title: "Bank statements — month 1",
        description: "Latest full month",
        status: "Awaiting",
      },
      {
        id: "dr2-doc-2",
        title: "Bank statements — month 2",
        status: "Awaiting",
      },
      {
        id: "dr2-doc-3",
        title: "Bank statements — month 3",
        status: "Awaiting",
      },
    ],
  },
  {
    id: "dr3",
    requestId: "BR-44120918",
    title: "Signed vendor agreement",
    requestedFrom: "Marcus Lin",
    relatedTo: "Deal: Vendor Management",
    documentType: "Contract",
    status: "Received",
    dueDate: "20/07/2026",
    requestedBy: "Tejas Gokhe",
    requestedDate: "12 Aug, 2026",
    lastUpdated: "19 Aug, 2026",
    progress: 86,
    receivedDate: "19/07/2026",
    receivedFileName: "Vendor_Agreement_Marcus.pdf",
    priority: "Normal",
    notes: "Uploaded via portal: review for approval.",
    items: [
      {
        id: "dr3-doc-1",
        title: "Signed vendor agreement",
        status: "Uploaded",
        fileName: "Vendor_Agreement_Marcus.pdf",
        fileKind: "pdf",
        uploadedAt: "19/07/2026",
        uploadedBy: "Marcus Lin",
        source: "portal",
      },
    ],
  },
  {
    id: "dr4",
    requestId: "BN-55288103",
    title: "Proposal pack for Greystone",
    requestedFrom: "Olivia Bennett",
    relatedTo: "Deal: Greystone Realty",
    documentType: "Proposal",
    status: "Approved",
    dueDate: "15/07/2026",
    requestedBy: "Tejas Gokhe",
    requestedDate: "08 Aug, 2026",
    lastUpdated: "14 Aug, 2026",
    progress: 100,
    receivedDate: "14/07/2026",
    receivedFileName: "Greystone_Proposal_v1.pdf",
    priority: "Low",
    clientName: "Greystone Realty",
    items: [
      {
        id: "dr4-doc-1",
        title: "Proposal pack",
        status: "Accepted",
        fileName: "Greystone_Proposal_v1.pdf",
        fileKind: "pdf",
        uploadedAt: "14/07/2026",
        uploadedBy: "Olivia Bennett",
        source: "portal",
        acceptedAt: "14/07/2026",
      },
      {
        id: "dr4-doc-2",
        title: "ID verification",
        status: "Accepted",
        fileName: "Olivia_Bennett_ID.pdf",
        fileKind: "pdf",
        uploadedAt: "13/07/2026",
        uploadedBy: "Olivia Bennett",
        source: "portal",
        acceptedAt: "14/07/2026",
      },
    ],
  },
  {
    id: "dr5",
    requestId: "BR-77301442",
    title: "Trust deed extract",
    requestedFrom: "Northwind Traders",
    relatedTo: "Company: Northwind Traders",
    documentType: "Legal",
    status: "Rejected",
    dueDate: "10/07/2026",
    requestedBy: "Roshna Abraham",
    requestedDate: "02 Aug, 2026",
    lastUpdated: "09 Aug, 2026",
    progress: 45,
    receivedDate: "09/07/2026",
    receivedFileName: "Trust_Deed_scan.pdf",
    priority: "High",
    notes: "Scan unreadable: request clearer copy.",
    items: [
      {
        id: "dr5-doc-1",
        title: "Trust deed extract",
        status: "Rejected",
        fileName: "Trust_Deed_scan.pdf",
        fileKind: "pdf",
        uploadedAt: "09/07/2026",
        uploadedBy: "Northwind Traders",
        source: "portal",
        rejectedAt: "09/07/2026",
        rejectionReason: "Scan is unreadable. Please upload a clearer copy.",
      },
    ],
  },
  {
    id: "dr6",
    requestId: "BN-11029487",
    title: "ASIC company extract",
    requestedFrom: "Fabrikam Inc.",
    relatedTo: "Company: Fabrikam Inc.",
    documentType: "Other",
    status: "Expired",
    dueDate: "05/07/2026",
    requestedBy: "John Smith",
    requestedDate: "20 Jul, 2026",
    lastUpdated: "05 Aug, 2026",
    progress: 0,
    priority: "Normal",
    notes: "No response after two reminders.",
  },
  {
    id: "dr7",
    requestId: "BR-66290155",
    title: "Employment contract copy",
    requestedFrom: "William Anderson",
    relatedTo: "Lead: William Anderson",
    documentType: "Refinance",
    status: "Requested",
    dueDate: "28/07/2026",
    requestedBy: "John Smith",
    requestedDate: "17 Aug, 2026",
    lastUpdated: "17 Aug, 2026",
    progress: 0,
    priority: "Normal",
  },
  {
    id: "dr8",
    requestId: "BN-33087124",
    title: "Payslips and tax return",
    requestedFrom: "Chloe Ramirez",
    relatedTo: "Lead: Chloe Ramirez",
    documentType: "Financial",
    status: "Pending",
    dueDate: "30/08/2026",
    requestedBy: "Shiva Kadhka",
    requestedDate: "15 Aug, 2026",
    lastUpdated: "18 Aug, 2026",
    progress: 58,
    priority: "High",
  },
  {
    id: "dr9",
    requestId: "BR-90881233",
    title: "ID verification pack",
    requestedFrom: "Priya Nair, Amit Shah",
    relatedTo: "Lead: Priya Nair",
    documentType: "ID Proof",
    status: "Approved",
    dueDate: "10/08/2026",
    requestedBy: "Bishnu Acharya",
    requestedDate: "01 Aug, 2026",
    lastUpdated: "10 Aug, 2026",
    progress: 100,
    receivedDate: "10/08/2026",
    receivedFileName: "ID_Pack_Priya.pdf",
    priority: "Low",
  },
  {
    id: "dr10",
    requestId: "BN-44556677",
    title: "Contract of sale",
    requestedFrom: "Jennifer Adams",
    relatedTo: "Lead: Jennifer Adams",
    documentType: "Property purchase",
    status: "Pending",
    dueDate: "28/08/2026",
    requestedBy: "Roshna Abraham",
    requestedDate: "16 Aug, 2026",
    lastUpdated: "20 Aug, 2026",
    progress: 12,
    priority: "Normal",
  },
  {
    id: "dr-portal-greystone",
    requestId: "DR-90881236",
    title: "Property purchase pack — Priya Mehta",
    requestedFrom: "Priya Mehta",
    relatedTo: "Greystone Realty",
    documentType: "Property purchase",
    status: "Requested",
    dueDate: "29/08/2026",
    requestedBy: "John Smith",
    requestedDate: "22 Aug, 2026",
    lastUpdated: "22 Aug, 2026",
    progress: 0,
    priority: "Normal",
    clientName: "Greystone Realty",
    clientEmail: "priya@greystone.example",
    reminderDate: "25 Aug 2026, 9:00 am",
    repeat:
      "Custom · every 2 days · start 2 days after request · stop when documents are completed",
    notifyBy: ["Email", "SMS"],
    notes: "Please upload these so we can proceed with pre-approval.",
    items: [
      {
        id: "dr-gs-licence",
        title: "Driver licence",
        description: "Front and back of current driver licence",
        applicant: "Priya Mehta",
        status: "Awaiting",
      },
      {
        id: "dr-gs-payslips",
        title: "Payslips",
        description: "Last 2 payslips",
        applicant: "Priya Mehta",
        status: "Awaiting",
      },
      {
        id: "dr-gs-statements",
        title: "Bank statements — last 3 months",
        applicant: "Priya Mehta",
        status: "Awaiting",
      },
    ],
  },
  ...buildExtraDocumentRequests(),
];

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
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DocumentRequest[];
    return parsed.map(normalize);
  } catch {
    return null;
  }
}

function writeStore(list: DocumentRequest[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list.map(normalize)));
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
