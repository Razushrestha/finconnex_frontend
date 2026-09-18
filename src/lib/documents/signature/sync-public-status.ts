import {
  applySignerCompleted,
  applySignerDecline,
  applySignerViewed,
  getRequestDocuments,
  upsertSignatureRequest,
  type SignatureRequest,
  type SignatureSigner,
  type SignerStatus,
} from "@/lib/documents/signature/types";
import { cacheSignatureDocumentFile } from "@/lib/documents/signature/file-cache";

export function parsePublicSignerStatus(raw: unknown): SignerStatus | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return null;
  if (value.includes("declin")) return "Declined";
  if (value === "signed" || value.endsWith("signed") || value === "completed") {
    return "Signed";
  }
  if (value.includes("view") || value.includes("open") || value.includes("access")) {
    return "Viewed";
  }
  if (value.includes("sent") || value.includes("mail")) return "Sent";
  return null;
}

type ProgressItem = {
  token?: string;
  status?: string;
  signedAt?: string | null;
  signerId?: string | null;
  signerEmail?: string | null;
  recipientName?: string | null;
  documentUrl?: string | null;
  fields?: unknown;
};

function mergePublicFieldValues(
  req: SignatureRequest,
  rawFields: unknown,
  signedUrl?: string,
): SignatureRequest {
  const incoming = Array.isArray(rawFields) ? rawFields : [];
  const values = new Map<string, string>();
  for (const row of incoming) {
    if (!row || typeof row !== "object") continue;
    const rec = row as { id?: string; value?: unknown };
    const id = String(rec.id ?? "").trim();
    if (!id || typeof rec.value !== "string" || !rec.value.trim()) continue;
    values.set(id, rec.value);
  }
  const fields = req.fields.map((field) => {
    const nextValue = values.get(field.id);
    return nextValue ? { ...field, value: nextValue } : field;
  });
  const docs = getRequestDocuments(req).map((doc, index) =>
    index === 0 && signedUrl ? { ...doc, fileUrl: signedUrl } : doc,
  );
  return {
    ...req,
    fields,
    documents: docs,
    documentFileUrl: signedUrl || req.documentFileUrl,
  };
}

function matchSigner(
  signers: SignatureSigner[],
  item: ProgressItem,
): SignatureSigner | undefined {
  const token = String(item.token ?? "").trim();
  const signerId = String(item.signerId ?? "").trim();
  const email = String(item.signerEmail ?? "").trim().toLowerCase();
  const name = String(item.recipientName ?? "").trim().toLowerCase();
  return (
    signers.find((signer) => token && signer.token === token) ||
    signers.find((signer) => signerId && signer.id === signerId) ||
    signers.find(
      (signer) => email && signer.email.trim().toLowerCase() === email,
    ) ||
    signers.find(
      (signer) => name && signer.name.trim().toLowerCase() === name,
    )
  );
}

async function loadProgress(
  req: SignatureRequest,
): Promise<ProgressItem[]> {
  const tokens = req.signers
    .map((signer) => signer.token?.trim())
    .filter(Boolean) as string[];
  const posted = await fetch("/api/sign/progress", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: req.id, tokens }),
  })
    .then((res) => res.json() as Promise<{ items?: ProgressItem[] }>)
    .catch(() => null);
  if (Array.isArray(posted?.items) && posted.items.length) return posted.items;

  const items: ProgressItem[] = [];
  for (const token of tokens) {
    const data = await fetch(`/api/sign/${encodeURIComponent(token)}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((res) => res.json() as Promise<Record<string, unknown>>)
      .catch(() => null);
    if (!data) continue;
    items.push({
      token,
      status: typeof data.status === "string" ? data.status : undefined,
      signedAt: typeof data.signedAt === "string" ? data.signedAt : null,
      signerId: typeof data.signerId === "string" ? data.signerId : null,
      signerEmail: typeof data.signerEmail === "string" ? data.signerEmail : null,
      recipientName:
        typeof data.recipientName === "string" ? data.recipientName : null,
      documentUrl:
        typeof data.documentUrl === "string" ? data.documentUrl : null,
      fields: data.fields,
    });
  }
  return items;
}

export async function syncSignatureRequestFromPublicLinks(
  req: SignatureRequest,
): Promise<SignatureRequest> {
  const items = await loadProgress(req);
  let next = req;
  for (const item of items) {
    const signer = matchSigner(next.signers, item);
    if (!signer || signer.role === "CC") continue;
    const status = parsePublicSignerStatus(item.status);
    if (!status) continue;
    const token = (item.token || signer.token || "").trim();
    const signedUrl =
      typeof item.documentUrl === "string" && item.documentUrl.trim()
        ? item.documentUrl.trim()
        : token
          ? `/api/sign/${encodeURIComponent(token)}/document`
          : undefined;
    if (status === "Viewed" || status === "Signed" || status === "Declined") {
      next = mergePublicFieldValues(next, item.fields, signedUrl);
    }
    if (status === "Viewed") next = applySignerViewed(next, signer.id);
    if (status === "Signed") {
      next =
        signer.status === "Signed"
          ? upsertSignatureRequest(next)
          : applySignerCompleted(
              next,
              signer.id,
              item.signedAt || undefined,
            );
      if (signedUrl) {
        void cacheSignatureDocumentFile(next.id, "primary", signedUrl);
      }
    }
    if (status === "Declined") next = applySignerDecline(next, signer.id);
  }
  return next;
}
