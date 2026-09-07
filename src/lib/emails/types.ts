export type EmailStatus =
  | "Draft"
  | "Scheduled"
  | "Sent"
  | "Delivered"
  | "Opened"
  | "Bounced"
  | "Failed";

export type EmailImportance = "high" | "normal" | "low";

export interface EmailAttachmentMeta {
  id: string;
  name: string;
  sizeLabel?: string;
}

export interface Email {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  relatedTo?: string;
  relatedType?: string;
  relatedId?: string;
  templateUsed?: string;
  status: EmailStatus;
  sentDate?: string;
  openedDate?: string;
  importance?: EmailImportance;
  attachments?: EmailAttachmentMeta[];
}

export interface EmailColumn {
  id: string;
  title: string;
  count: number;
  badgeColorClass: string;
  emails: Email[];
}

export const emails: Email[] = [];

function buildColumn(
  id: string,
  title: string,
  status: EmailStatus,
  badgeColorClass: string,
): EmailColumn {
  const columnEmails = emails.filter((e) => e.status === status);
  return {
    id,
    title,
    count: columnEmails.length,
    badgeColorClass,
    emails: columnEmails,
  };
}

export const emailColumns: EmailColumn[] = [
  buildColumn("draft", "Draft", "Draft", "bg-slate-400 text-white"),
  buildColumn("scheduled", "Scheduled", "Scheduled", "bg-sky-500 text-white"),
  buildColumn("sent", "Sent", "Sent", "bg-emerald-400 text-white"),
  buildColumn("delivered", "Delivered", "Delivered", "bg-teal-400 text-white"),
  buildColumn("opened", "Opened", "Opened", "bg-indigo-400 text-white"),
  buildColumn("bounced", "Bounced", "Bounced", "bg-amber-400 text-white"),
  buildColumn("failed", "Failed", "Failed", "bg-rose-400 text-white"),
];
