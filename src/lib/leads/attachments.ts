import { createAttachment, listAttachments } from "@/lib/attachments/store";
import type { AttachmentKind } from "@/lib/attachments/types";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  createCrmDocument,
  toCreateDocumentBody,
  tryCrmDocument,
} from "@/lib/documents/library/api";
import {
  upsertLibraryDocument,
  type LibraryDocument,
} from "@/lib/documents/library/types";
import { tryCrmStorage, uploadCrmStorageFile } from "@/lib/storage/api";
import { emitRulesChange } from "@/lib/rules/storage";
import { relatedMatchesLead } from "@/lib/leads/activity-index";

export function leadRelatedLabel(leadName: string) {
  return `Lead: ${leadName}`;
}

export function listLocalLeadAttachments(leadId: string | undefined, leadName: string) {
  return listAttachments().filter((row) => {
    if (leadId && row.relatedTo?.toLowerCase().includes(leadId.toLowerCase())) {
      return true;
    }
    return relatedMatchesLead(row.relatedTo, leadName);
  });
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

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function attachFileToLead(input: {
  file: File;
  fileName?: string;
  notes?: string;
  leadId?: string;
  leadName: string;
  owner: string;
}): Promise<{ fileName: string; savedToCrm: boolean }> {
  const fileName = (input.fileName?.trim() || input.file.name).trim();
  if (!fileName) throw new Error("Choose a file to upload.");

  const relatedTo = isUuid(input.leadId)
    ? `${leadRelatedLabel(input.leadName)} ${input.leadId}`
    : leadRelatedLabel(input.leadName);

  const stored = await tryCrmStorage(() => uploadCrmStorageFile(input.file));
  let remote: LibraryDocument | null = null;
  if (isUuid(input.leadId) && stored?.key) {
    remote = await tryCrmDocument(() =>
      createCrmDocument(
        toCreateDocumentBody({
          fileName,
          folder: "Clients",
          documentType: documentTypeFor(fileName),
          storageKey: stored.key,
          mimeType: stored.contentType || input.file.type,
          sizeBytes: stored.size || input.file.size,
          leadId: input.leadId,
          relatedTo,
          description: input.notes?.trim() || undefined,
        }),
      ),
    );
    if (remote) upsertLibraryDocument(remote);
  }

  createAttachment({
    fileName: remote?.fileName || stored?.fileName || fileName,
    kind: guessKind(fileName),
    relatedTo,
    uploadedBy: input.owner || "You",
    notes: input.notes?.trim() || undefined,
    sizeLabel: remote?.sizeLabel || sizeLabel(stored?.size || input.file.size),
    storageUrl: stored?.url || remote?.storageUrl,
    contentType: stored?.contentType || input.file.type,
    byteSize: stored?.size || input.file.size,
  });
  emitRulesChange("all");
  return { fileName, savedToCrm: Boolean(remote?.id || stored?.key) };
}
