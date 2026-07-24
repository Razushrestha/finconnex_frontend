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

export const attachmentsSeed: Attachment[] = [
  {
    id: "att-1",
    fileName: "rate-lock-checklist.pdf",
    kind: "Document",
    relatedTo: "Lead: William Anderson",
    uploadedBy: "John Smith",
    uploadedAt: "22/07/2026 04:15 PM",
    sizeLabel: "240 KB",
    notes: "Shared after discovery call",
  },
  {
    id: "att-2",
    fileName: "id-scan.jpg",
    kind: "Image",
    relatedTo: "Lead: Chloe Ramirez",
    uploadedBy: "Shiva Kadhka",
    uploadedAt: "21/07/2026 11:00 AM",
    sizeLabel: "1.2 MB",
  },
];
