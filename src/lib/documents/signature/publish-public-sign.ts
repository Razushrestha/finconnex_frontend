import {
  getRequestDocuments,
  type SignatureRequest,
} from "@/lib/documents/signature/types";
import { loadCachedSignatureFile } from "@/lib/documents/signature/file-cache";

function toPublicFields(req: SignatureRequest) {
  return req.fields.map((field) => {
    const raw = field.value ?? null;
    const value =
      typeof raw === "string" && raw.startsWith("data:") && raw.length > 4000
        ? null
        : raw;
    return {
      id: field.id,
      recipientId: field.signerId,
      type: field.kind,
      pageNumber: field.page || 1,
      page: field.page || 1,
      x: field.x,
      y: field.y,
      width: field.w,
      height: field.h,
      required: field.required !== false,
      value,
    };
  });
}

async function resolveDocumentBlob(
  req: SignatureRequest,
  files?: File[],
): Promise<Blob | null> {
  if (files?.[0] && files[0].size > 0) return files[0];
  const docs = getRequestDocuments(req);
  const primary = docs[0];
  if (!primary) return null;
  try {
    const cached = await loadCachedSignatureFile(req.id, primary.id);
    if (cached && cached.size > 0) return cached;
  } catch {
    /* indexedDB unavailable */
  }
  const url = primary.fileUrl;
  if (!url || url.startsWith("fc-file://") || url.startsWith("blob:")) {
    if (url?.startsWith("blob:")) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0) return blob;
        }
      } catch {
        return null;
      }
    }
    return null;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

function accessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.sessionStorage.getItem("fc.crm.accessToken") ||
      window.localStorage.getItem("fc.crm.accessToken")
    )?.trim() || null;
  } catch {
    return null;
  }
}

export async function publishPublicSignSession(
  req: SignatureRequest,
  files?: File[],
): Promise<SignatureRequest> {
  const blob = await resolveDocumentBlob(req, files);
  const form = new FormData();
  form.append(
    "meta",
    JSON.stringify({
      documentName: req.documentName,
      fields: toPublicFields(req),
      signers: req.signers.map((signer) => ({
        token: signer.token,
        name: signer.name,
        role: signer.role,
        id: signer.id,
        email: signer.email,
      })),
      requestId: req.id,
    }),
  );
  if (blob) {
    const fileName =
      getRequestDocuments(req)[0]?.fileName || req.documentFile || "document.pdf";
    form.append(
      "file",
      blob instanceof File ? blob : new File([blob], fileName, { type: blob.type || "application/pdf" }),
    );
  }

  const token = accessToken();
  const res = await fetch("/api/sign/publish", {
    method: "POST",
    credentials: "same-origin",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    tokens?: Record<string, string>;
  };
  if (!res.ok) {
    throw new Error(json.error || "Could not publish the signing link");
  }
  const tokens = json.tokens ?? {};
  if (!Object.keys(tokens).length) return req;
  return {
    ...req,
    signers: req.signers.map((signer) => ({
      ...signer,
      token: tokens[signer.token] ?? signer.token,
    })),
  };
}
