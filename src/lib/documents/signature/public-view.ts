import { normalizeFieldKind } from "@/lib/documents/signature/field-kinds";
import {
  DEFAULT_PLACED_FIELD_HEIGHT,
  DEFAULT_PLACED_FIELD_WIDTH,
} from "@/lib/documents/signature/field-placement";
import { makeSigner, type SignatureField, type SignatureRequest, type SignatureSigner } from "@/lib/documents/signature/types";

export type PublicSignatureView = {
  documentName?: string;
  documentUrl?: string | null;
  recipientName?: string;
  role?: string;
  status?: string;
  canAct?: boolean;
  expiresAt?: string | null;
  message?: string | null;
  fields?: Array<{
    id?: string;
    recipientId?: string;
    type?: string;
    pageNumber?: number;
    page?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    required?: boolean;
    value?: string | null;
  }>;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toPercent(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n <= 1) return n * 100;
  return Math.min(100, n);
}

/** Editor stores x/y as page % and w/h as overlay pixels (typically 140×36). */
function toOverlaySize(
  value: number,
  percentToPx: number,
  pixelMin: number,
  fallback: number,
) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  if (value <= 1) return value * percentToPx;
  if (value <= pixelMin) return (value / 100) * percentToPx;
  return value;
}

export function mapPublicSignatureView(
  token: string,
  view: PublicSignatureView,
): { request: SignatureRequest; signer: SignatureSigner } {
  const recipientId =
    pickStr(view.fields?.[0]?.recipientId) || `public-${token}`;
  const signer = makeSigner({
    id: recipientId,
    name: pickStr(view.recipientName, "Signer"),
    email: "",
    order: 1,
    token,
    role: pickStr(view.role).toLowerCase().includes("approv")
      ? "Approver"
      : "Signer",
    status: pickStr(view.status).toLowerCase().includes("view")
      ? "Viewed"
      : pickStr(view.status).toLowerCase().includes("sign")
        ? "Signed"
        : "Sent",
  });

  const fields: SignatureField[] = (view.fields ?? []).map((field, index) => {
    const width = Number(field.width ?? 0);
    const height = Number(field.height ?? 0);
    return {
      id: pickStr(field.id) || `pf-${index + 1}`,
      kind: normalizeFieldKind(pickStr(field.type, "TEXT").toLowerCase()),
      label: pickStr(field.type, "Field"),
      x: toPercent(Number(field.x ?? 0)),
      y: toPercent(Number(field.y ?? 0)),
      w: toOverlaySize(
        width,
        700,
        40,
        DEFAULT_PLACED_FIELD_WIDTH,
      ),
      h: toOverlaySize(
        height,
        900,
        20,
        DEFAULT_PLACED_FIELD_HEIGHT,
      ),
      page: field.pageNumber || field.page || 1,
      signerId: pickStr(field.recipientId, recipientId),
      required: field.required !== false,
      value: pickStr(field.value) || undefined,
      documentId: "primary",
    };
  });

  const documentName = pickStr(view.documentName, "Document");
  const documentUrl = pickStr(view.documentUrl) || undefined;
  const request: SignatureRequest = {
    id: `public-${token}`,
    signatureRequestId: `PUB-${token.slice(0, 8)}`,
    documentName,
    documentFile: `${documentName}.pdf`,
    documentFileUrl: documentUrl,
    documents: [
      {
        id: "primary",
        name: documentName,
        fileName: `${documentName}.pdf`,
        fileUrl: documentUrl,
      },
    ],
    signer: signer.name,
    signerEmail: signer.email,
    signers: [signer],
    fields,
    signingOrder: "sequential",
    status: signer.status === "Signed" ? "Signed" : "Sent",
    expiryDate: pickStr(view.expiresAt),
    createdBy: "",
    manageToken: token,
    audit: [],
  };

  return { request, signer };
}
