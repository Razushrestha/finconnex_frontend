/** SRS §9.2 Document Requests */

export type DocumentRequestType =
  | "Contract"
  | "Proposal"
  | "ID Proof"
  | "Financial"
  | "Legal"
  | "Other";

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
];

export const DOCUMENT_REQUEST_STATUSES: DocumentRequestStatus[] = [
  "Requested",
  "Pending",
  "Received",
  "Approved",
  "Rejected",
  "Expired",
];

export interface DocumentRequest {
  id: string;
  requestId: string;
  title: string;
  requestedFrom: string;
  relatedTo?: string;
  documentType: DocumentRequestType;
  status: DocumentRequestStatus;
  dueDate: string;
  requestedBy: string;
  requestedDate: string;
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

export const documentRequests: DocumentRequest[] = [
  {
    id: "dr1",
    requestId: "DR-1001",
    title: "ID + income proof for pre-approval",
    requestedFrom: "William Anderson",
    relatedTo: "Lead: William Anderson",
    documentType: "ID Proof",
    status: "Requested",
    dueDate: "25/07/2026",
    requestedBy: "John Smith",
    requestedDate: "18/07/2026",
    notes: "Need passport or driver licence + last 2 payslips.",
  },
  {
    id: "dr2",
    requestId: "DR-1002",
    title: "Bank statements: last 3 months",
    requestedFrom: "Chloe Ramirez",
    relatedTo: "Lead: Chloe Ramirez",
    documentType: "Financial",
    status: "Pending",
    dueDate: "22/07/2026",
    requestedBy: "Shiva Kadhka",
    requestedDate: "16/07/2026",
    notes: "Client said they will upload by Friday.",
  },
  {
    id: "dr3",
    requestId: "DR-1003",
    title: "Signed vendor agreement",
    requestedFrom: "Marcus Lin",
    relatedTo: "Deal: Vendor Management",
    documentType: "Contract",
    status: "Received",
    dueDate: "20/07/2026",
    requestedBy: "Tejas Gokhe",
    requestedDate: "12/07/2026",
    receivedDate: "19/07/2026",
    receivedFileName: "Vendor_Agreement_Marcus.pdf",
    notes: "Uploaded via portal: review for approval.",
  },
  {
    id: "dr4",
    requestId: "DR-1004",
    title: "Proposal pack for Greystone",
    requestedFrom: "Olivia Bennett",
    relatedTo: "Deal: Greystone Realty",
    documentType: "Proposal",
    status: "Approved",
    dueDate: "15/07/2026",
    requestedBy: "Tejas Gokhe",
    requestedDate: "08/07/2026",
    receivedDate: "14/07/2026",
    receivedFileName: "Greystone_Proposal_v1.pdf",
  },
  {
    id: "dr5",
    requestId: "DR-1005",
    title: "Trust deed extract",
    requestedFrom: "Northwind Traders",
    relatedTo: "Company: Northwind Traders",
    documentType: "Legal",
    status: "Rejected",
    dueDate: "10/07/2026",
    requestedBy: "Roshna Abraham",
    requestedDate: "02/07/2026",
    receivedDate: "09/07/2026",
    receivedFileName: "Trust_Deed_scan.pdf",
    notes: "Scan unreadable: request clearer copy.",
  },
  {
    id: "dr6",
    requestId: "DR-1006",
    title: "ASIC company extract",
    requestedFrom: "Fabrikam Inc.",
    relatedTo: "Company: Fabrikam Inc.",
    documentType: "Other",
    status: "Expired",
    dueDate: "05/07/2026",
    requestedBy: "John Smith",
    requestedDate: "20/06/2026",
    notes: "No response after two reminders.",
  },
  {
    id: "dr7",
    requestId: "DR-1007",
    title: "Employment contract copy",
    requestedFrom: "William Anderson",
    relatedTo: "Lead: William Anderson",
    documentType: "Contract",
    status: "Requested",
    dueDate: "28/07/2026",
    requestedBy: "John Smith",
    requestedDate: "20/07/2026",
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

const STORE_KEY = "documents:requests";

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

function readStore(): DocumentRequest[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as DocumentRequest[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: DocumentRequest[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listDocumentRequests(): DocumentRequest[] {
  return readStore() ?? documentRequests.map((r) => ({ ...r }));
}

export function upsertDocumentRequest(req: DocumentRequest) {
  const list = listDocumentRequests();
  const i = list.findIndex((r) => r.id === req.id);
  if (i >= 0) list[i] = req;
  else list.unshift(req);
  writeStore(list);
  return req;
}

export function replaceDocumentRequests(list: DocumentRequest[]) {
  writeStore(list);
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
