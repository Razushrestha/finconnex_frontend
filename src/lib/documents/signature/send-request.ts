import { notifySigners } from "@/components/documents/signature/create/Notify";
import { getNewlyNotifiedSigners } from "@/lib/documents/signature/mock-send";
import { bakePrefillIntoCachedDocuments } from "@/lib/documents/signature/bake-prefill";
import {
  isCrmSignatureRequestId,
  persistRemoteSignatureRequest,
  sendCrmSignatureRequest,
  syncCrmSignatureDraft,
  tryCrmSignatureRequest,
} from "@/lib/documents/signature/api";
import {
  createCrmDocument,
  tryCrmDocument,
} from "@/lib/documents/library/api";
import { tryCrmStorage, uploadCrmStorageFile, isLocalStorageKey } from "@/lib/storage/api";
import {
  getRequestDocuments,
  markRequestSent,
  upsertSignatureRequest,
  type SignatureRequest,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { loadCachedSignatureFile } from "@/lib/documents/signature/file-cache";
import { publishPublicSignSession } from "@/lib/documents/signature/publish-public-sign";

export async function uploadPrimaryAsCrmDocument(
  req: SignatureRequest,
): Promise<string | undefined> {
  const docs = getRequestDocuments(req);
  const primary = docs[0];
  if (!primary) return undefined;
  const blob =
    (await loadCachedSignatureFile(req.id, primary.id)) ||
    (primary.fileUrl?.startsWith("blob:")
      ? await fetch(primary.fileUrl)
          .then((res) => res.blob())
          .catch(() => null)
      : null);
  if (!blob || blob.size < 1) return undefined;

  const fileName = primary.fileName || req.documentFile || "document.pdf";
  const file = new File([blob], fileName, {
    type: blob.type || "application/pdf",
  });
  const stored = await tryCrmStorage(() => uploadCrmStorageFile(file));
  if (!stored?.key || isLocalStorageKey(stored.key)) return undefined;
  const created = await tryCrmDocument(() =>
    createCrmDocument({
      name: req.documentName || fileName,
      fileName,
      key: stored.key,
      mimeType: stored.contentType || file.type || "application/pdf",
      sizeBytes: stored.size || file.size,
      documentType: "OTHER",
    }),
  );
  return created?.id;
}

export async function deliverSignatureRequest(
  draft: SignatureRequest,
  actorName: string,
): Promise<{ sent: SignatureRequest; notified: SignatureSigner[] }> {
  const baked = await bakePrefillIntoCachedDocuments(draft);
  const prepared = upsertSignatureRequest(baked.request, {
    allowEmptyFields: true,
  });
  const documentId = await uploadPrimaryAsCrmDocument(prepared);
  const synced = await syncCrmSignatureDraft(prepared, { documentId });

  let emailedByCrm = false;
  let working = synced;
  if (isCrmSignatureRequestId(synced.id)) {
    const remote = await tryCrmSignatureRequest(() =>
      sendCrmSignatureRequest(synced.id),
    );
    if (remote) {
      working = persistRemoteSignatureRequest(remote) ?? synced;
      emailedByCrm = true;
    }
  }

  working = await publishPublicSignSession(working, baked.pdfFiles);

  if (!emailedByCrm) {
    const pending = working.signers.filter(
      (signer) => signer.role !== "CC" && signer.status !== "Signed" && signer.status !== "Declined",
    );
    await notifySigners(working, pending, baked.pdfFiles);
  }

  const sent = markRequestSent(working, actorName);
  return { sent, notified: getNewlyNotifiedSigners(draft, sent) };
}
