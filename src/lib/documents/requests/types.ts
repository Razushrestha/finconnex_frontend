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
    Received: "Submitted",
    Approved: "Submitted",
    Rejected: "Rejected",
    Expired: "Expired",
  };

export const DOCUMENT_REQUEST_STATUS_PILL: Record<DocumentRequestStatus, string> =
  {
    Requested: "bg-sky-100 text-sky-700",
    Pending: "bg-amber-100 text-amber-800",
    Received: "bg-emerald-100 text-emerald-700",
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
  /** Broker / owner */
  requestedBy: string;
  /** Start / invite date (display e.g. 20 Aug, 2026) */
  requestedDate: string;
  lastUpdated: string;
  /** 0–100 completion of the document pack */
  progress: number;
  receivedDate?: string;
  notes?: string;
  receivedFileName?: string;
}

export interface DocumentRequestColumn {
  id: string;
  title: DocumentRequestStatus;
  count: number;
  badgeColorClass: string;
  requests: DocumentRequest[];
}

function progressForStatus(status: DocumentRequestStatus): number {
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
    notes: "Client said they will upload by Friday.",
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
    notes: "Uploaded via portal: review for approval.",
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
    notes: "Scan unreadable: request clearer copy.",
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
  },
];

const COLUMN_COLORS: Record<DocumentRequestStatus, string> = {
  Requested: "bg-sky-500 text-white",
  Pending: "bg-amber-500 text-white",
  Received: "bg-violet-500 text-white",
  Approved: "bg-emerald-500 text-white",
  Rejected: "bg-rose-500 text-white",
  Expired: "bg-slate-400 text-white",
};

const STORE_KEY = "documents:requests:v2";

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

function normalize(req: DocumentRequest): DocumentRequest {
  return {
    ...req,
    lastUpdated: req.lastUpdated || req.requestedDate,
    progress:
      typeof req.progress === "number"
        ? req.progress
        : progressForStatus(req.status),
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
