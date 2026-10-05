"use client";

import type { ZohoSendFormSettings } from "@/components/documents/signature/create/ZohoStyleSendForm";
import type { PlacedField } from "@/components/documents/signature/create/PdfFieldEditor";
import type { SignatureSigner } from "@/lib/documents/signature/types";
import { getTenantContext } from "@/lib/persistence/tenant";

export type SignatureCreateDraft = {
  id: string;
  signatureRequestId: string;
  manageToken: string;
  documentName?: string;
  primaryFileName?: string;
  additional?: { id: string; name: string; fileName: string }[];
  recipients?: SignatureSigner[];
  signingOrder?: "sequential" | "parallel";
  zohoSettings?: ZohoSendFormSettings;
  emailMessage?: string;
  placedFields?: PlacedField[];
};

const DRAFT_PREFIX = "fc-signature-create-draft:";

function tenantScope() {
  return getTenantContext().tenantId?.trim() || "default";
}

export function signatureCreateDraftKey(requestId: string) {
  return `${DRAFT_PREFIX}${tenantScope()}:${requestId}`;
}

export function readSignatureCreateDraft(
  requestId: string,
): SignatureCreateDraft | null {
  if (typeof window === "undefined" || !requestId) return null;
  try {
    const raw = sessionStorage.getItem(signatureCreateDraftKey(requestId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SignatureCreateDraft;
    if (!parsed?.id || parsed.id !== requestId) return null;
    if (!parsed.signatureRequestId || !parsed.manageToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSignatureCreateDraft(draft: SignatureCreateDraft) {
  if (typeof window === "undefined" || !draft.id) return;
  try {
    sessionStorage.setItem(
      signatureCreateDraftKey(draft.id),
      JSON.stringify(draft),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearSignatureCreateDraft(requestId: string) {
  if (typeof window === "undefined" || !requestId) return;
  try {
    sessionStorage.removeItem(signatureCreateDraftKey(requestId));
  } catch {
    /* ignore */
  }
}

/** Clears every in-progress signature create draft for this tenant (e.g. on sign-out). */
export function clearAllSignatureCreateDraftsForTenant() {
  if (typeof window === "undefined") return;
  const needle = `${DRAFT_PREFIX}${tenantScope()}:`;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(needle)) sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}
