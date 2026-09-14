import {
  downloadCrmSignatureRequest,
  isCrmSignatureRequestId,
  tryCrmSignatureRequest,
} from "@/lib/documents/signature/api";
import {
  loadCachedSignatureFile,
  parseSignatureFilePointer,
  resolveSignatureDocumentFileUrl,
} from "@/lib/documents/signature/file-cache";
import {
  getComposeDocuments,
  isPdfBytes,
  requestHasStampableValues,
  signedAttachmentName,
  stampRequestDocument,
} from "@/lib/documents/signature/stamp-signed-pdf";
import { isEmailAddress } from "@/lib/emails/address";
import { officeDocToPdfFile } from "@/lib/emails/office-to-pdf";
import { getRequestDocuments, type SignatureRequest } from "./types";

export function signatureRecipientEmails(req: SignatureRequest | null | undefined) {
  const emails: string[] = [];
  const seen = new Set<string>();
  for (const signer of req?.signers ?? []) {
    const email = signer.email?.trim();
    if (!email || !isEmailAddress(email)) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }
  const fallback = req?.signerEmail?.trim();
  if (fallback && isEmailAddress(fallback) && !seen.has(fallback.toLowerCase())) {
    emails.unshift(fallback);
  }
  return emails;
}

export function signatureComposeRecipient(req: SignatureRequest | null | undefined) {
  const primary =
    req?.signers.find((signer) => isEmailAddress(signer.email || "")) ??
    req?.signers[0];
  const email = signatureRecipientEmails(req)[0] || primary?.email || "";
  const name = primary?.name || email.split("@")[0] || "Recipient";
  return { name, email };
}

async function fileFromUrl(url: string, fileName: string): Promise<File | null> {
  try {
    const sameOrigin =
      url.startsWith("/") ||
      (typeof window !== "undefined" && url.startsWith(window.location.origin));
    const response = await fetch(url, {
      credentials: sameOrigin ? "include" : "omit",
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size === 0) return null;
    return new File([blob], fileName, {
      type: blob.type || "application/pdf",
    });
  } catch {
    return null;
  }
}

function fileFromBlob(blob: Blob, fileName: string): File {
  return new File([blob], fileName, {
    type: blob.type || "application/pdf",
  });
}

async function signedFileFromCrm(req: SignatureRequest): Promise<File | null> {
  if (req.status !== "Signed" || !isCrmSignatureRequestId(req.id)) return null;
  const hit = await tryCrmSignatureRequest(() =>
    downloadCrmSignatureRequest(req.id),
  );
  if (!hit?.url) return null;
  const primary = getRequestDocuments(req)[0];
  return fileFromUrl(
    hit.url,
    signedAttachmentName(primary?.fileName || req.documentFile || "document.pdf"),
  );
}

export async function filesFromSignatureRequest(
  req: SignatureRequest | null | undefined,
): Promise<File[]> {
  if (!req) return [];
  const docs = getComposeDocuments(req);
  const canStamp = requestHasStampableValues(req);
  const files: File[] = [];
  const crmSigned = !canStamp ? await signedFileFromCrm(req) : null;
  const usedNames = new Set<string>();

  function uniqueName(name: string) {
    let next = name;
    let i = 2;
    while (usedNames.has(next.toLowerCase())) {
      const suffix = next.includes(".")
        ? next.replace(/(\.[^.]+)$/, `-${i}$1`)
        : `${next}-${i}`;
      next = suffix;
      i += 1;
    }
    usedNames.add(next.toLowerCase());
    return next;
  }

  for (let index = 0; index < docs.length; index++) {
    const doc = docs[index]!;
    const fileName =
      doc.fileName || doc.name || `document-${index + 1}.pdf`;
    const storedUrl =
      doc.fileUrl || (index === 0 ? req.documentFileUrl : undefined);
    const resolved = await resolveSignatureDocumentFileUrl(
      req.id,
      doc.id,
      storedUrl,
    );
    const url = resolved && !resolved.startsWith("fc-file://") ? resolved : "";
    let original: File | null = url ? await fileFromUrl(url, fileName) : null;

    if (!original) {
      const pointer = parseSignatureFilePointer(storedUrl);
      const cached =
        (await loadCachedSignatureFile(req.id, doc.id)) ||
        (pointer
          ? await loadCachedSignatureFile(pointer.requestId, pointer.documentId)
          : null);
      if (cached) original = fileFromBlob(cached, fileName);
    }

    if (!original && index === 0 && crmSigned) {
      original = crmSigned;
    }
    if (!original) continue;

    let working = original;
    let bytes = new Uint8Array(await working.arrayBuffer());
    if (!isPdfBytes(bytes)) {
      const asPdf = await officeDocToPdfFile(working);
      if (asPdf) {
        working = asPdf;
        bytes = new Uint8Array(await working.arrayBuffer());
      }
    }

    if (canStamp && isPdfBytes(bytes)) {
      const stamped = await stampRequestDocument(req, doc.id, index, bytes);
      const stampedPart = stamped.buffer.slice(
        stamped.byteOffset,
        stamped.byteOffset + stamped.byteLength,
      ) as ArrayBuffer;
      files.push(
        new File([stampedPart], uniqueName(signedAttachmentName(working.name)), {
          type: "application/pdf",
        }),
      );
      continue;
    }
    files.push(
      new File([working], uniqueName(working.name), { type: working.type }),
    );
  }

  if (!files.length && crmSigned) return [crmSigned];
  return files;
}
