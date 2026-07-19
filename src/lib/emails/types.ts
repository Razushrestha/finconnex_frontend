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
    status: "Opened",
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

export const emailColumns: EmailColumn[] = [
  {
    id: "draft",
    title: "Draft",
    count: 24,
    badgeColorClass: "bg-slate-400 text-white",
    emails: emails.filter((e) => e.status === "Draft"),
  },
  {
    id: "scheduled",
    title: "Scheduled",
    count: 57,
    badgeColorClass: "bg-sky-500 text-white",
    emails: emails.filter((e) => e.status === "Scheduled"),
  },
  {
    id: "sent",
    title: "Sent",
    count: 812,
    badgeColorClass: "bg-emerald-400 text-white",
    emails: emails.filter((e) => e.status === "Sent"),
  },
  {
    id: "failed",
    title: "Failed",
    count: 19,
    badgeColorClass: "bg-rose-400 text-white",
    emails: emails.filter((e) => e.status === "Failed"),
  },
];
