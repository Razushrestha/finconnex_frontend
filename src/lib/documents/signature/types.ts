/** SRS §9.3 E-Signature */

export type SignatureStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Signed"
  | "Declined"
  | "Expired"
  | "Cancelled";

export const SIGNATURE_STATUSES: SignatureStatus[] = [
  "Draft",
  "Sent",
  "Viewed",
  "Signed",
  "Declined",
  "Expired",
  "Cancelled",
];

export interface SignatureAuditEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
  ip?: string;
}

export interface SignatureRequest {
  id: string;
  signatureRequestId: string;
  documentName: string;
  documentFile: string;
  signer: string;
  signerEmail: string;
  relatedTo?: string;
  status: SignatureStatus;
  sentDate?: string;
  signedDate?: string;
  expiryDate: string;
  ipAddress?: string;
  createdBy: string;
  manageToken: string;
  audit: SignatureAuditEvent[];
  /** typed name or data-URL from draw canvas */
  signatureData?: string;
}

const STORE_KEY = "signature:requests";

export const signatureRequests: SignatureRequest[] = [
  {
    id: "sr1",
    signatureRequestId: "ES-2001",
    documentName: "Engagement Letter — Anderson",
    documentFile: "Anderson_Engagement_Letter.pdf",
    signer: "William Anderson",
    signerEmail: "william@example.com",
    relatedTo: "Lead: William Anderson",
    status: "Sent",
    sentDate: "18/07/2026",
    expiryDate: "01/08/2026",
    createdBy: "John Smith",
    manageToken: "sig-anderson-1",
    audit: [
      {
        id: "a1",
        at: "18/07/2026 09:00",
        action: "Created",
        actor: "John Smith",
      },
      {
        id: "a2",
        at: "18/07/2026 09:05",
        action: "Sent for signature",
        actor: "John Smith",
      },
    ],
  },
  {
    id: "sr2",
    signatureRequestId: "ES-2002",
    documentName: "Greystone Proposal Acceptance",
    documentFile: "Greystone_Proposal.pdf",
    signer: "Olivia Bennett",
    signerEmail: "olivia@northwind.com",
    relatedTo: "Deal: Greystone Realty",
    status: "Signed",
    sentDate: "10/07/2026",
    signedDate: "12/07/2026",
    expiryDate: "24/07/2026",
    ipAddress: "203.0.113.42",
    createdBy: "Tejas Gokhe",
    manageToken: "sig-olivia-1",
    audit: [
      {
        id: "a1",
        at: "10/07/2026 11:00",
        action: "Created",
        actor: "Tejas Gokhe",
      },
      {
        id: "a2",
        at: "10/07/2026 11:10",
        action: "Sent for signature",
        actor: "Tejas Gokhe",
      },
      {
        id: "a3",
        at: "11/07/2026 08:22",
        action: "Viewed",
        actor: "Olivia Bennett",
        ip: "203.0.113.42",
      },
      {
        id: "a4",
        at: "12/07/2026 14:05",
        action: "Signed",
        actor: "Olivia Bennett",
        ip: "203.0.113.42",
      },
    ],
  },
  {
    id: "sr3",
    signatureRequestId: "ES-2003",
    documentName: "NDA — Fabrikam",
    documentFile: "NDA_Fabrikam.pdf",
    signer: "Marcus Lin",
    signerEmail: "marcus@fabrikam.com",
    relatedTo: "Company: Fabrikam Inc.",
    status: "Draft",
    expiryDate: "30/07/2026",
    createdBy: "Roshna Abraham",
    manageToken: "sig-marcus-draft",
    audit: [
      {
        id: "a1",
        at: "20/07/2026 16:00",
        action: "Created",
        actor: "Roshna Abraham",
      },
    ],
  },
];

function readStore(): SignatureRequest[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as SignatureRequest[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: SignatureRequest[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

/** Seed + any session mutations / newly created drafts */
export function listSignatureRequests(): SignatureRequest[] {
  return readStore() ?? signatureRequests.map((r) => ({ ...r }));
}

export function upsertSignatureRequest(req: SignatureRequest) {
  const list = listSignatureRequests();
  const i = list.findIndex((r) => r.id === req.id);
  if (i >= 0) list[i] = req;
  else list.unshift(req);
  writeStore(list);
  return req;
}

export function getSignatureRequestById(id: string) {
  return listSignatureRequests().find((r) => r.id === id);
}

export function getSignatureByToken(token: string) {
  return listSignatureRequests().find((r) => r.manageToken === token);
}

export function nextSignatureIds() {
  const list = listSignatureRequests();
  const nums = list
    .map((r) => Number(r.signatureRequestId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 2000) + 1;
  const id = `sr-${Date.now()}`;
  return {
    id,
    signatureRequestId: `ES-${n}`,
    manageToken: `sig-${id}`,
  };
}

export function formatAuditAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const DEMO_SIGNER_IP = "203.0.113.99";
