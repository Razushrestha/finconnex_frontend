import { createAttachment, listAttachments } from "@/lib/attachments/store";
import type { AttachmentKind } from "@/lib/attachments/types";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  createCrmDocument,
  toCreateDocumentBody,
} from "@/lib/documents/library/api";
import {
  upsertLibraryDocument,
  type LibraryDocument,
} from "@/lib/documents/library/types";
import { uploadCrmStorageFile } from "@/lib/storage/api";
import { emitRulesChange } from "@/lib/rules/storage";

export function dealRelatedLabel(dealName: string) {
  return `Deal: ${dealName}`;
}

export function isDealRelatedAttachment(
  relatedTo: string | undefined,
  dealId: string,
  dealName: string,
) {
  const raw = (relatedTo ?? "").trim();
  if (!raw) return false;
  if (dealId && raw.toLowerCase().includes(dealId.toLowerCase())) return true;
  const label = dealRelatedLabel(dealName).toLowerCase();
  return raw.toLowerCase() === label || raw.toLowerCase().startsWith(`${label} `);
}

export function listLocalDealAttachments(dealId: string, dealName: string) {
  return listAttachments().filter((row) =>
    isDealRelatedAttachment(row.relatedTo, dealId, dealName),
  );
}

function guessKind(fileName: string): AttachmentKind {
  const lower = fileName.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|heic)$/.test(lower)) return "Image";
  if (/\.(xlsx?|csv)$/.test(lower)) return "Spreadsheet";
  if (/\.(pdf|docx?|txt)$/.test(lower)) return "Document";
  return "Other";
}

function documentTypeFor(fileName: string) {
  return /\.pdf$/i.test(fileName) ? "PROPOSAL" : "OTHER";
}

export async function attachFileToDeal(input: {
  file: File;
  fileName?: string;
  notes?: string;
  dealId: string;
  dealName: string;
  owner: string;
}): Promise<{ fileName: string }> {
  const fileName = (input.fileName?.trim() || input.file.name).trim();
  if (!fileName) throw new Error("Choose a file to upload.");

  const relatedTo = isUuid(input.dealId)
    ? `${dealRelatedLabel(input.dealName)} ${input.dealId}`
    : dealRelatedLabel(input.dealName);

  const stored = await uploadCrmStorageFile(input.file);
  let remote: LibraryDocument | null = null;
  if (isUuid(input.dealId) && stored.key) {
    remote = await createCrmDocument(
      toCreateDocumentBody({
        fileName,
        folder: "Deals",
        documentType: documentTypeFor(fileName),
        storageKey: stored.key,
        mimeType: stored.contentType || input.file.type,
        sizeBytes: stored.size || input.file.size,
        dealId: input.dealId,
        relatedTo,
        description: input.notes?.trim() || undefined,
      }),
    );
    if (remote) upsertLibraryDocument(remote);
  }

  createAttachment({
    fileName: remote?.fileName || stored.fileName || fileName,
    kind: guessKind(fileName),
    relatedTo,
    uploadedBy: input.owner || "You",
    notes: input.notes?.trim() || undefined,
    sizeLabel: remote?.sizeLabel,
    storageUrl: stored.url || remote?.storageUrl,
    contentType: stored.contentType || input.file.type,
    byteSize: stored.size || input.file.size,
  });
  emitRulesChange("all");
  return { fileName };
}
