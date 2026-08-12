export type EmailStatus =
  | "Draft"
  | "Scheduled"
  | "Sent"
  | "Delivered"
  | "Opened"
  | "Bounced"
  | "Failed";

export interface Email {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  relatedTo?: string;
  templateUsed?: string;
  status: EmailStatus;
  sentDate?: string;
  openedDate?: string;
}

export interface EmailColumn {
  id: string;
  title: string;
  count: number;
  badgeColorClass: string;
  emails: Email[];
}

export const emails: Email[] = [
  {
    id: "e1",
    subject: "Following up on our proposal",
    body: "Hi Shiva, just checking in on the proposal we sent last week...",
    from: "bishnu@nepatronix.com",
    to: ["shiva.khadka@example.com"],
    relatedTo: "Shiva Khadka",
    templateUsed: "Follow-up Template",
    status: "Draft",
    sentDate: "16/07/2026 10:15 AM",
    openedDate: "16/07/2026 11:40 AM",
  },
  {
    id: "e2",
    subject: "Following up on our proposal",
    body: "Hi Shiva, just checking in on the proposal we sent last week...",
    from: "bishnu@nepatronix.com",
    to: ["shiva.khadka@example.com"],
    relatedTo: "Shiva Khadka",
    templateUsed: "Follow-up Template",
    status: "Opened",
    sentDate: "16/07/2026 10:15 AM",
    openedDate: "16/07/2026 11:40 AM",
  },
  {
    id: "e3",
    subject: "Following up on our proposal",
    body: "Hi Shiva, just checking in on the proposal we sent last week...",
    from: "bishnu@nepatronix.com",
    to: ["shiva.khadka@example.com"],
    relatedTo: "Shiva Khadka",
    templateUsed: "Follow-up Template",
    status: "Opened",
    sentDate: "16/07/2026 10:15 AM",
    openedDate: "16/07/2026 11:40 AM",
  },
];

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
