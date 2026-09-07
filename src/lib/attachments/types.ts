/** Lead / activity attachments (document upload log for demo). */

export const ATTACHMENT_KINDS = [
  "Document",
  "Image",
  "Spreadsheet",
  "Other",
] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export interface Attachment {
  id: string;
  fileName: string;
  kind: AttachmentKind;
  relatedTo?: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
  /** Demo-only size label */
  sizeLabel?: string;
  /** Phase 15 — binary storage location (CDN / local://). */
  storageUrl?: string;
  contentType?: string;
  byteSize?: number;
}

export const attachmentsSeed: Attachment[] = [];
