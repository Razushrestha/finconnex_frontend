/** Live attachments store (session-backed). */

import {
  attachmentsSeed,
  type Attachment,
  type AttachmentKind,
} from "@/lib/attachments/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

function cloneSeed(): Attachment[] {
  return attachmentsSeed.map((a) => ({ ...a }));
}

const store = createBoardStore({
  key: "activities:attachments:list:v1",
  seed: cloneSeed,
});

export function listAttachments(): Attachment[] {
  return store.list();
}

export function saveAttachments(items: Attachment[]) {
  store.save(items);
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
  emitLeadActivityChange();
  return row;
}

export function getAttachment(id: string): Attachment | undefined {
  return listAttachments().find((a) => a.id === id);
}
