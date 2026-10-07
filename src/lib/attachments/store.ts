/** Live attachments store (session-backed). */

import {
  attachmentsSeed,
  type Attachment,
  type AttachmentKind,
} from "@/lib/attachments/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { logCreate } from "@/lib/rules/audit";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

function cloneSeed(): Attachment[] {
  return attachmentsSeed.map((a) => ({ ...a }));
}

const store = createBoardStore({
  key: "activities:attachments:list:v2",
  seed: cloneSeed,
});

export function listAttachments(): Attachment[] {
  return store.list();
}

export function saveAttachments(items: Attachment[]) {
  const compact = items.map((item) => {
    const url = item.storageUrl;
    // Persist only compact URLs; huge data: URLs blow session storage quota (PDFs).
    if (url?.startsWith("data:") && url.length > 120_000) {
      return { ...item, storageUrl: undefined };
    }
    return item;
  });
  try {
    store.save(compact);
  } catch {
    // Last resort: drop all data URLs so the new row can still be saved.
    store.save(
      compact.map((item) =>
        item.storageUrl?.startsWith("data:")
          ? { ...item, storageUrl: undefined }
          : item,
      ),
    );
  }
}

export function createAttachment(input: {
  fileName: string;
  kind?: AttachmentKind;
  relatedTo?: string;
  uploadedBy?: string;
  notes?: string;
  sizeLabel?: string;
  uploadedAt?: string;
  storageUrl?: string;
  contentType?: string;
  byteSize?: number;
}): Attachment {
  const row: Attachment = {
    id: newRulesId("att"),
    fileName: input.fileName.trim() || "untitled.bin",
    kind: input.kind ?? "Document",
    relatedTo: input.relatedTo?.trim() || undefined,
    uploadedBy: input.uploadedBy?.trim() || "You",
    uploadedAt: input.uploadedAt ?? formatRulesAt(new Date()),
    notes: input.notes?.trim() || undefined,
    sizeLabel: input.sizeLabel,
    storageUrl: input.storageUrl,
    contentType: input.contentType,
    byteSize: input.byteSize,
  };
  saveAttachments([row, ...listAttachments()]);
  const leadLabel =
    row.relatedTo?.match(/^Lead:\s*(.+)$/i)?.[1]?.trim() || row.fileName;
  logCreate("activities.attachments", row.uploadedBy, row.id, leadLabel);
  emitLeadActivityChange();
  return row;
}

export function getAttachment(id: string): Attachment | undefined {
  return listAttachments().find((a) => a.id === id);
}

export function deleteAttachment(id: string): boolean {
  const list = listAttachments();
  const next = list.filter((item) => item.id !== id);
  if (next.length === list.length) return false;
  saveAttachments(next);
  emitLeadActivityChange();
  return true;
}
