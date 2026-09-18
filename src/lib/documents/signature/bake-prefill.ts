import {
  PREFILL_RECIPIENT_ID,
  getRequestDocuments,
  type SignatureField,
  type SignatureRequest,
} from "@/lib/documents/signature/types";
import {
  cacheSignatureDocumentBlob,
  loadCachedSignatureFile,
} from "@/lib/documents/signature/file-cache";
import {
  fieldsForDocument,
  isPdfBytes,
  resolveFieldStampValue,
  stampSignedPdfBytes,
} from "@/lib/documents/signature/stamp-signed-pdf";

function pdfFileName(fileName: string) {
  const trimmed = fileName.trim() || "document.pdf";
  if (/\.pdf$/i.test(trimmed)) return trimmed;
  return `${trimmed.replace(/\.[^.]+$/, "") || "document"}.pdf`;
}

async function blobFromUrl(url?: string): Promise<Blob | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

export function prefillFieldsWithValues(
  fields: SignatureField[],
): SignatureField[] {
  return fields.filter(
    (field) =>
      field.signerId === PREFILL_RECIPIENT_ID &&
      Boolean(resolveFieldStampValue(field)),
  );
}

export async function bakePrefillIntoCachedDocuments(
  req: SignatureRequest,
): Promise<{ request: SignatureRequest; pdfFiles: File[] }> {
  const prefill = prefillFieldsWithValues(req.fields);
  if (!prefill.length) {
    return { request: req, pdfFiles: [] };
  }

  const docs = getRequestDocuments(req);
  const bakedDocIds = new Set<string>();
  const pdfFiles: File[] = [];
  const nextDocs = [...docs];

  for (let index = 0; index < docs.length; index += 1) {
    const doc = docs[index];
    const blob =
      (await loadCachedSignatureFile(req.id, doc.id)) ||
      (await blobFromUrl(doc.fileUrl)) ||
      (index === 0 ? await blobFromUrl(req.documentFileUrl) : null);
    if (!blob) continue;

    const source = new Uint8Array(await blob.arrayBuffer());
    if (!isPdfBytes(source)) continue;

    const fields = fieldsForDocument(
      { ...req, fields: prefill },
      doc.id,
      index,
    );
    if (!fields.length) continue;

    let stamped: Uint8Array;
    try {
      stamped = await stampSignedPdfBytes(source, fields, req.signers);
    } catch {
      continue;
    }

    const name = pdfFileName(doc.fileName || req.documentFile || "document.pdf");
    const file = new File(
      [Uint8Array.from(stamped) as unknown as BlobPart],
      name,
      { type: "application/pdf" },
    );
    await cacheSignatureDocumentBlob(req.id, doc.id, file);
    bakedDocIds.add(doc.id);
    pdfFiles.push(file);
    const objectUrl = URL.createObjectURL(file);
    nextDocs[index] = { ...doc, fileName: name, fileUrl: objectUrl };
  }

  const fields = req.fields.filter((field) => {
    if (field.signerId !== PREFILL_RECIPIENT_ID) return true;
    const docId = field.documentId || "primary";
    return !bakedDocIds.has(docId);
  });

  const primary = nextDocs[0];
  return {
    request: {
      ...req,
      documents: nextDocs,
      documentFile: primary?.fileName || req.documentFile,
      documentFileUrl: primary?.fileUrl || req.documentFileUrl,
      fields,
    },
    pdfFiles,
  };
}
