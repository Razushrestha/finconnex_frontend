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

/** Distinguishes a reusable template from a live signature request/document.
 * Independent of `status` — a template can be edited (Draft-like) but is
 * never "sent" or "signed" the way a real request is. */
export type RecordType = "document" | "template";

export type SignerRole = "Signer" | "Approver" | "CC";
export type SignerStatus =
  | "Pending"
  | "Sent"
  | "Viewed"
  | "Signed"
  | "Declined";
export type SigningOrderMode = "sequential" | "parallel";
export type SignatureFieldKind =
  | "signature"
  | "initials"
  | "date"
  | "name"
  | "text";

export type DeliveryMethod = "email" | "email_sms";

export interface SignatureAuditEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
  ip?: string;
}

export interface SignatureSigner {
  id: string;
  name: string;
  email: string;
  /** 1-based signing order when sequential */
  order: number;
  role: SignerRole;
  status: SignerStatus;
  /** Unique public link token for this signer */
  token: string;
  signedAt?: string;
  /** typed:… or data-URL */
  signatureData?: string;
  deliveryMethod: DeliveryMethod;
  colorIndex: number;
}

export interface SignatureField {
  id: string;
  kind: SignatureFieldKind;
  label: string;
  /** Percent of preview width (0–100) */
  x: number;
  /** Percent of preview height (0–100) */
  y: number;
  w: number;
  h: number;
  page: number;
  signerId: string;
  required: boolean;
  value?: string;
  /**
   * Which document this field belongs to — matches a SignatureDocument.id.
   * Defaults to "primary" for legacy fields/requests created before
   * multi-document support existed.
   */
  documentId?: string;
}

/** One file attached to a signature request — the primary document or an
 * additional one. A request with a single document still gets a one-item
 * `documents` array so every consumer can treat requests uniformly. */
export interface SignatureDocument {
  /** "primary" for the main document, or an additional-document id. */
  id: string;
  /** Display name (without extension is fine — used as a label/tab). */
  name: string;
  /** File name including extension, used to detect PDF vs Word etc. */
  fileName: string;
  /** Persistent URL — a data: URL (base64) so it survives reload/another
   * browser, NOT a blob: object URL which only lives in the tab that
   * created it. */
  fileUrl?: string;
}

export interface SignatureRequest {
  id: string;
  signatureRequestId: string;
  documentName: string;
  documentFile: string;
  documentFileUrl?: string;
  /**
   * All attached documents (primary + additional), in signing order.
   * Optional for backward compat with requests created before
   * multi-document support — use `getRequestDocuments()` to read this
   * with a safe fallback to the legacy `documentFile`/`documentFileUrl`
   * pair rather than accessing it directly.
   */
  documents?: SignatureDocument[];
  /** Whether this record is a reusable template or a real document/request.
   * Optional on input — always normalized to a concrete value by
   * `normalizeSignatureRequest`, so anything read via `listSignatureRequests()`
   * or `getSignatureRequestById()` is guaranteed to have it set. */
  recordType?: RecordType;
  /** @deprecated use signers[0] — kept for table/bridge compat */
  signer: string;
  /** @deprecated use signers[0] */
  signerEmail: string;
  signers: SignatureSigner[];
  fields: SignatureField[];
  signingOrder: SigningOrderMode;
  relatedTo?: string;
  relatedQuotationId?: string;
  status: SignatureStatus;
  sentDate?: string;
  signedDate?: string;
  expiryDate: string;
  ipAddress?: string;
  createdBy: string;
  /** Legacy primary token — mirrors first signer token */
  manageToken: string;
  audit: SignatureAuditEvent[];
  /** @deprecated use signers[].signatureData */
  signatureData?: string;
  /** Last time this record was created or modified (ISO string). Set/refreshed
   * on every upsert; used for "Last Updated" display instead of faking a date
   * client-side on every render. */
  updatedAt?: string;
}

const STORE_KEY = "signature:requests:v2";
const LEGACY_STORE_KEY = "signature:requests";

export const SIGNER_COLORS = [
  {
    bg: "bg-violet-100",
    text: "text-violet-800",
    border: "border-violet-400",
    hex: "#7C3AED",
  },
  {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-400",
    hex: "#CA8A04",
  },
  {
    bg: "bg-amber-100",
    text: "text-amber-900",
    border: "border-amber-400",
    hex: "#D97706",
  },
  {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-400",
    hex: "#059669",
  },
  {
    bg: "bg-rose-100",
    text: "text-rose-800",
    border: "border-rose-400",
    hex: "#E11D48",
  },
] as const;

export function makeSigner(partial: {
  id: string;
  name: string;
  email: string;
  order: number;
  token: string;
  colorIndex?: number;
  status?: SignerStatus;
  role?: SignerRole;
  signedAt?: string;
  signatureData?: string;
}): SignatureSigner {
  return {
    id: partial.id,
    name: partial.name,
    email: partial.email,
    order: partial.order,
    role: partial.role ?? "Signer",
    deliveryMethod: "email",
    status: partial.status ?? "Pending",
    token: partial.token,
    colorIndex:
      partial.colorIndex ?? (partial.order - 1) % SIGNER_COLORS.length,
    signedAt: partial.signedAt,
    signatureData: partial.signatureData,
  };
}

function defaultFieldsForSigner(
  signerId: string,
  order: number,
): SignatureField[] {
  const y = 62 + (order - 1) * 10;
  return [
    {
      id: `fld-${signerId}-sig`,
      kind: "signature",
      label: "Signature",
      x: 12,
      y: Math.min(y, 88),
      w: 36,
      h: 7,
      page: 1,
      signerId,
      required: true,
    },
  ];
}

/** Normalize legacy single-signer records into multi-signer shape. */
export function normalizeSignatureRequest(
  raw: SignatureRequest,
  opts?: { allowEmptyFields?: boolean },
): SignatureRequest {
  const signers = raw.signers?.length
    ? raw.signers.map((s, i) => ({
        ...s,
        order: s.order || i + 1,
        colorIndex: s.colorIndex ?? i % SIGNER_COLORS.length,
        role: s.role ?? ("Signer" as SignerRole),
        status: s.status ?? ("Pending" as SignerStatus),
      }))
    : [
        makeSigner({
          id: `sg-${raw.id}-1`,
          name: raw.signer,
          email: raw.signerEmail,
          order: 1,
          token: raw.manageToken,
          status:
            raw.status === "Signed"
              ? "Signed"
              : raw.status === "Viewed"
                ? "Viewed"
                : raw.status === "Sent"
                  ? "Sent"
                  : raw.status === "Declined"
                    ? "Declined"
                    : "Pending",
          signedAt: raw.signedDate,
          signatureData: raw.signatureData,
        }),
      ];

  const hasFields = Array.isArray(raw.fields) && raw.fields.length > 0;
  const fields = hasFields
    ? raw.fields
    : opts?.allowEmptyFields ||
        (raw.status === "Draft" &&
          Array.isArray(raw.fields) &&
          raw.fields.length === 0)
      ? []
      : signers.flatMap((s) => defaultFieldsForSigner(s.id, s.order));

  const primary = signers[0];
  return {
    ...raw,
    recordType: raw.recordType ?? "document",
    signers,
    fields,
    signingOrder: raw.signingOrder ?? "sequential",
    signer: primary?.name ?? raw.signer,
    signerEmail: primary?.email ?? raw.signerEmail,
    manageToken: primary?.token ?? raw.manageToken,
    signatureData: primary?.signatureData ?? raw.signatureData,
  };
}

export function primarySignerLabel(req: SignatureRequest): string {
  const n = normalizeSignatureRequest(req);
  if (n.signers.length <= 1) return n.signer;
  return `${n.signer} +${n.signers.length - 1}`;
}

/**
 * Always read a request's documents through this — never `req.documents`
 * directly. Falls back to a single-item list built from the legacy
 * `documentFile`/`documentFileUrl` fields for requests (including all
 * seed/demo data) created before multi-document support existed.
 */
export function getRequestDocuments(
  req: SignatureRequest,
): SignatureDocument[] {
  if (req.documents && req.documents.length > 0) return req.documents;
  if (!req.documentFile) return [];
  return [
    {
      id: "primary",
      name: req.documentName || req.documentFile,
      fileName: req.documentFile,
      fileUrl: req.documentFileUrl,
    },
  ];
}

export function signedCount(req: SignatureRequest): number {
  return normalizeSignatureRequest(req).signers.filter(
    (s) => s.status === "Signed",
  ).length;
}

export function computeOverallStatus(req: SignatureRequest): SignatureStatus {
  const n = normalizeSignatureRequest(req);
  if (
    n.status === "Cancelled" ||
    n.status === "Expired" ||
    n.status === "Draft"
  ) {
    return n.status;
  }
  const actionable = n.signers.filter((s) => s.role !== "CC");
  if (actionable.some((s) => s.status === "Declined")) return "Declined";
  if (actionable.length > 0 && actionable.every((s) => s.status === "Signed"))
    return "Signed";
  // In-progress: keep Viewed once anyone opens; otherwise Sent while awaiting.
  if (actionable.some((s) => s.status === "Viewed" || s.status === "Signed"))
    return "Viewed";
  if (actionable.some((s) => s.status === "Sent")) return "Sent";
  return n.status === "Sent" ? "Sent" : n.status;
}

export function getActiveSigner(req: SignatureRequest): SignatureSigner | null {
  const n = normalizeSignatureRequest(req);
  if (n.signingOrder === "parallel") {
    return (
      n.signers.find(
        (s) =>
          s.role !== "CC" && s.status !== "Signed" && s.status !== "Declined",
      ) ?? null
    );
  }
  const ordered = [...n.signers]
    .filter((s) => s.role !== "CC")
    .sort((a, b) => a.order - b.order);
  return (
    ordered.find((s) => s.status !== "Signed" && s.status !== "Declined") ??
    null
  );
}

export function canSignerAccess(
  req: SignatureRequest,
  signerId: string,
): boolean {
  const n = normalizeSignatureRequest(req);
  if (
    n.status === "Cancelled" ||
    n.status === "Expired" ||
    n.status === "Draft"
  )
    return false;
  const signer = n.signers.find((s) => s.id === signerId);
  if (!signer || signer.role === "CC") return false;
  if (signer.status === "Signed") return true;
  if (n.signingOrder === "parallel") return true;
  const active = getActiveSigner(n);
  return active?.id === signerId;
}

export const signatureRequests: SignatureRequest[] = [
  normalizeSignatureRequest({
    id: "sr1",
    signatureRequestId: "ES-2001",
    documentName: "Engagement Letter: Anderson",
    documentFile: "Anderson_Engagement_Letter.pdf",
    recordType: "document",
    signer: "William Anderson",
    signerEmail: "william@example.com",
    signers: [
      makeSigner({
        id: "sg-sr1-1",
        name: "William Anderson",
        email: "william@example.com",
        order: 1,
        token: "sig-anderson-1",
        status: "Sent",
      }),
    ],
    fields: [],
    signingOrder: "sequential",
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
  }),
  normalizeSignatureRequest({
    id: "sr2",
    signatureRequestId: "ES-2002",
    documentName: "Greystone Proposal Acceptance",
    documentFile: "Greystone_Proposal.pdf",
    recordType: "document",
    signer: "Olivia Bennett",
    signerEmail: "olivia@northwind.com",
    signers: [
      makeSigner({
        id: "sg-sr2-1",
        name: "Olivia Bennett",
        email: "olivia@northwind.com",
        order: 1,
        token: "sig-olivia-1",
        status: "Signed",
        signedAt: "12/07/2026",
        signatureData: "typed:Olivia Bennett",
      }),
      makeSigner({
        id: "sg-sr2-2",
        name: "James Greystone",
        email: "james@greystone.example",
        order: 2,
        token: "sig-james-1",
        status: "Signed",
        signedAt: "12/07/2026",
        signatureData: "typed:James Greystone",
        colorIndex: 1,
      }),
    ],
    fields: [],
    signingOrder: "sequential",
    relatedTo: "Deal: Greystone Realty",
    relatedQuotationId: "quo1",
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
        action: "Signed by Olivia Bennett",
        actor: "Olivia Bennett",
        ip: "203.0.113.42",
      },
      {
        id: "a5",
        at: "12/07/2026 16:20",
        action: "Signed by James Greystone",
        actor: "James Greystone",
        ip: "203.0.113.55",
      },
    ],
  }),
  normalizeSignatureRequest({
    id: "sr-quo2",
    signatureRequestId: "ES-2004",
    documentName: "Engagement: Harbour packaging quotation",
    documentFile: "QUO-3102_Contract.pdf",
    recordType: "document",
    signer: "Marcus Chen",
    signerEmail: "marcus@harbour.example",
    signers: [
      makeSigner({
        id: "sg-quo2-1",
        name: "Marcus Chen",
        email: "marcus@harbour.example",
        order: 1,
        token: "sig-harbour-quo2",
        status: "Sent",
      }),
    ],
    fields: [],
    signingOrder: "sequential",
    relatedTo: "Quotation: QUO-3102",
    relatedQuotationId: "quo2",
    status: "Sent",
    sentDate: "19/07/2026",
    expiryDate: "10/08/2026",
    createdBy: "Tejas Gokhe",
    manageToken: "sig-harbour-quo2",
    audit: [
      {
        id: "a1",
        at: "19/07/2026 11:05",
        action: "Created from quotation",
        actor: "Tejas Gokhe",
      },
      {
        id: "a2",
        at: "19/07/2026 11:05",
        action: "Sent for signature",
        actor: "Tejas Gokhe",
      },
    ],
  }),
  normalizeSignatureRequest({
    id: "sr3",
    signatureRequestId: "ES-2003",
    documentName: "NDA: Fabrikam",
    documentFile: "NDA_Fabrikam.pdf",
    recordType: "document",
    signer: "Marcus Lin",
    signerEmail: "marcus@fabrikam.com",
    signers: [
      makeSigner({
        id: "sg-sr3-1",
        name: "Marcus Lin",
        email: "marcus@fabrikam.com",
        order: 1,
        token: "sig-marcus-draft",
        status: "Pending",
      }),
      makeSigner({
        id: "sg-sr3-2",
        name: "Priya Shah",
        email: "priya@fabrikam.com",
        order: 2,
        token: "sig-priya-draft",
        status: "Pending",
        colorIndex: 1,
      }),
    ],
    fields: [],
    signingOrder: "sequential",
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
  }),
];

function readStore(): SignatureRequest[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as SignatureRequest[];

    const legacy = localStorage.getItem(LEGACY_STORE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as SignatureRequest[];
      const migrated = parsed.map((r) => normalizeSignatureRequest(r));
      localStorage.setItem(STORE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStore(list: SignatureRequest[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listSignatureRequests(): SignatureRequest[] {
  const stored = readStore();
  if (stored) return stored.map((r) => normalizeSignatureRequest(r));
  const seeded = signatureRequests.map((r) =>
    normalizeSignatureRequest({ ...r }),
  );
  writeStore(seeded);
  return seeded;
}

export function upsertSignatureRequest(
  req: SignatureRequest,
  opts?: { allowEmptyFields?: boolean },
) {
  const normalized = normalizeSignatureRequest(req, opts);
  const list = listSignatureRequests();
  const i = list.findIndex((r) => r.id === normalized.id);
  const withTimestamp = { ...normalized, updatedAt: new Date().toISOString() };
  if (i >= 0) list[i] = withTimestamp;
  else list.unshift(withTimestamp);
  writeStore(list);
  return withTimestamp;
}

export function getSignatureRequestById(id: string) {
  return listSignatureRequests().find((r) => r.id === id);
}

/** Resolve by request manageToken OR any signer token. */
export function getSignatureByToken(token: string): {
  request: SignatureRequest;
  signer: SignatureSigner;
} | null {
  for (const req of listSignatureRequests()) {
    const signer = req.signers.find((s) => s.token === token);
    if (signer) return { request: req, signer };
    if (req.manageToken === token && req.signers[0]) {
      return { request: req, signer: req.signers[0] };
    }
  }
  return null;
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

export function newSignerId() {
  return `sg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newSignerToken(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 16);
  return `sig-${slug || "signer"}-${Date.now().toString(36)}`;
}

export function buildSignersFromDraft(
  rows: { name: string; email: string }[],
): SignatureSigner[] {
  return rows.map((row, i) =>
    makeSigner({
      id: newSignerId(),
      name: row.name.trim(),
      email: row.email.trim(),
      order: i + 1,
      token: newSignerToken(row.name),
      colorIndex: i % SIGNER_COLORS.length,
      status: "Pending",
    }),
  );
}

export function ensureDefaultFields(req: SignatureRequest): SignatureRequest {
  const n = normalizeSignatureRequest(req);
  if (n.fields.length > 0) return n;
  return {
    ...n,
    fields: n.signers.flatMap((s) => defaultFieldsForSigner(s.id, s.order)),
  };
}

export function markRequestSent(req: SignatureRequest, actor: string) {
  const n = ensureDefaultFields(req);
  const today = new Date().toLocaleDateString("en-AU");
  const actionable = n.signers
    .filter((s) => s.role !== "CC")
    .sort((a, b) => a.order - b.order);

  const nextActive =
    n.signingOrder === "parallel"
      ? null
      : (actionable.find(
          (s) => s.status !== "Signed" && s.status !== "Declined",
        ) ?? null);

  const signers = n.signers.map((s) => {
    if (s.role === "CC") return s;
    if (s.status === "Signed" || s.status === "Declined") return s;
    if (n.signingOrder === "parallel") {
      return { ...s, status: "Sent" as SignerStatus };
    }
    if (nextActive && s.id === nextActive.id) {
      return { ...s, status: "Sent" as SignerStatus };
    }
    return { ...s, status: "Pending" as SignerStatus };
  });

  const overall = computeOverallStatus({
    ...n,
    signers,
    status: n.status === "Draft" ? "Sent" : n.status,
  });

  return upsertSignatureRequest({
    ...n,
    signers,
    status: overall === "Signed" ? "Signed" : "Sent",
    sentDate: n.sentDate ?? today,
    signer: signers[0]?.name ?? n.signer,
    signerEmail: signers[0]?.email ?? n.signerEmail,
    manageToken: signers[0]?.token ?? n.manageToken,
    audit: [
      ...n.audit,
      {
        id: `a-send-${Date.now()}`,
        at: formatAuditAt(),
        action: `Sent for signature · ${actionable.length} signer(s)`,
        actor,
      },
    ],
  });
}

export function applySignerSignature(
  req: SignatureRequest,
  signerId: string,
  signatureData: string,
): SignatureRequest {
  const n = normalizeSignatureRequest(req);
  const today = new Date().toLocaleDateString("en-AU");
  const signers = n.signers.map((s) => {
    if (s.id !== signerId) return s;
    return {
      ...s,
      status: "Signed" as SignerStatus,
      signedAt: today,
      signatureData,
    };
  });

  let nextSigners = signers;
  if (n.signingOrder === "sequential") {
    const ordered = [...signers]
      .filter((s) => s.role !== "CC")
      .sort((a, b) => a.order - b.order);
    const nextPending = ordered.find((s) => s.status === "Pending");
    if (nextPending) {
      nextSigners = signers.map((s) =>
        s.id === nextPending.id ? { ...s, status: "Sent" as SignerStatus } : s,
      );
    }
  }

  const fields = n.fields.map((f) => {
    if (f.signerId !== signerId) return f;
    const isDate =
      f.kind === "date" ||
      (f as any).kind === "sign_date" ||
      f.label?.toLowerCase().includes("date");
    const isSig =
      f.kind === "signature" ||
      f.kind === "initials" ||
      (f as any).kind === "sign" ||
      f.label?.toLowerCase().includes("signature");

    if (isSig) return { ...f, value: signatureData };
    if (f.kind === "name")
      return {
        ...f,
        value: signers.find((s) => s.id === signerId)?.name,
      };
    if (isDate) return { ...f, value: today };
    return f;
  });

  const actor = signers.find((s) => s.id === signerId)?.name ?? "Signer";
  const draft: SignatureRequest = {
    ...n,
    signers: nextSigners,
    fields,
    audit: [
      ...n.audit,
      {
        id: `a-sign-${Date.now()}`,
        at: formatAuditAt(),
        action: `Signed by ${actor}`,
        actor,
        ip: DEMO_SIGNER_IP,
      },
    ],
  };

  const overall = computeOverallStatus(draft);
  const primary = nextSigners[0];
  return upsertSignatureRequest({
    ...draft,
    status: overall,
    signedDate: overall === "Signed" ? today : draft.signedDate,
    ipAddress: DEMO_SIGNER_IP,
    signatureData: primary?.signatureData,
    signer: primary?.name ?? draft.signer,
    signerEmail: primary?.email ?? draft.signerEmail,
  });
}

export function applySignerViewed(
  req: SignatureRequest,
  signerId: string,
): SignatureRequest {
  const n = normalizeSignatureRequest(req);
  const signer = n.signers.find((s) => s.id === signerId);
  if (!signer) return n;
  if (
    signer.status === "Signed" ||
    signer.status === "Declined" ||
    signer.status === "Viewed"
  ) {
    return n;
  }

  const signers = n.signers.map((s) =>
    s.id === signerId ? { ...s, status: "Viewed" as SignerStatus } : s,
  );
  const draft: SignatureRequest = {
    ...n,
    signers,
    audit: [
      ...n.audit,
      {
        id: `a-view-${Date.now()}`,
        at: formatAuditAt(),
        action: `Viewed by ${signer.name}`,
        actor: signer.name,
        ip: DEMO_SIGNER_IP,
      },
    ],
  };
  return upsertSignatureRequest({
    ...draft,
    status: computeOverallStatus(draft),
  });
}

export function applySignerDecline(
  req: SignatureRequest,
  signerId: string,
): SignatureRequest {
  const n = normalizeSignatureRequest(req);
  const signer = n.signers.find((s) => s.id === signerId);
  if (!signer) return n;
  const signers = n.signers.map((s) =>
    s.id === signerId ? { ...s, status: "Declined" as SignerStatus } : s,
  );
  const draft: SignatureRequest = {
    ...n,
    signers,
    audit: [
      ...n.audit,
      {
        id: `a-dec-${Date.now()}`,
        at: formatAuditAt(),
        action: `Declined by ${signer.name}`,
        actor: signer.name,
        ip: DEMO_SIGNER_IP,
      },
    ],
  };
  return upsertSignatureRequest({
    ...draft,
    status: "Declined",
  });
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

export function fieldKindLabel(kind: SignatureFieldKind): string {
  switch (kind) {
    case "signature":
      return "Signature";
    case "initials":
      return "Initials";
    case "date":
      return "Date";
    case "name":
      return "Full name";
    case "text":
      return "Text";
  }
}

export function deleteSignatureRequest(id: string): SignatureRequest[] {
  const list = listSignatureRequests().filter((r) => r.id !== id);
  writeStore(list);
  return list;
}

/** Replace the local store with live CRM rows (empty list is a valid live result). */
export function replaceCrmSignatureRequests(remote: SignatureRequest[]) {
  writeStore(
    remote.map((row) => normalizeSignatureRequest(row, { allowEmptyFields: true })),
  );
}

export function createDocumentFromTemplate(
  templateId: string,
): SignatureRequest | null {
  const template = getSignatureRequestById(templateId);
  if (!template || template.recordType !== "template") return null;

  const ids = nextSignatureIds();

  const idMap = new Map<string, string>();
  const signers = template.signers.map((s, i) => {
    const newId = newSignerId();
    idMap.set(s.id, newId);
    return makeSigner({
      id: newId,
      name: "",
      email: "",
      order: s.order || i + 1,
      token: newSignerToken(s.role || `signer-${i + 1}`),
      role: s.role,
      colorIndex: s.colorIndex,
      status: "Pending",
    });
  });

  const fields = template.fields.map((f) => ({
    ...f,
    id: `fld-${ids.id}-${f.id}`,
    signerId: idMap.get(f.signerId) ?? f.signerId,
  }));

  return {
    ...template,
    id: ids.id,
    signatureRequestId: ids.signatureRequestId,
    manageToken: ids.manageToken,
    recordType: "document",
    signers,
    fields,
    signer: "",
    signerEmail: "",
    status: "Draft",
    sentDate: undefined,
    signedDate: undefined,
    relatedTo: undefined,
    relatedQuotationId: undefined,
    updatedAt: undefined,
    audit: [
      {
        id: `a-${Date.now()}`,
        at: formatAuditAt(),
        action: `Created from template "${template.documentName}"`,
        actor: "Current User",
      },
    ],
  };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
