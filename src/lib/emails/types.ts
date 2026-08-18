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
    body: "Hi Shiva, just checking in on the proposal we sent last week. Happy to jump on a call if useful.",
    from: "bishnu@nepatronix.com",
    to: ["shiva.khadka@example.com"],
    relatedTo: "Shiva Khadka",
    templateUsed: "Follow-up Template",
    status: "Draft",
    sentDate: "19/08/2026 09:12 AM",
  },
  {
    id: "e2",
    subject: "Rate lock confirmation — Greystone refinance",
    body: "Hi William, confirming the rate lock is in place until Friday. Please reply if anything looks off.",
    from: "john.smith@finconnex.com",
    to: ["william.anderson@example.com"],
    relatedTo: "William Anderson",
    status: "Opened",
    sentDate: "18/08/2026 04:22 PM",
    openedDate: "18/08/2026 05:01 PM",
  },
  {
    id: "e3",
    subject: "Documents still outstanding",
    body: "Olivia, we still need the latest payslips and ID before we can lodge the application.",
    from: "shiva.kadhka@finconnex.com",
    to: ["olivia.bennett@example.com"],
    relatedTo: "Olivia Bennett",
    templateUsed: "Document Request",
    status: "Sent",
    sentDate: "16/07/2026 10:15 AM",
  },
  {
    id: "e4",
    subject: "Intro call recap: Blue Sky Media",
    body: "Thanks for the time today — next step is a full application pack and a follow-up next week.",
    from: "roshna@finconnex.com",
    to: ["katherina.brooks@example.com"],
    relatedTo: "Katherina Brooks",
    status: "Delivered",
    sentDate: "15/07/2026 02:40 PM",
  },
  {
    id: "e5",
    subject: "Meeting reminder: Harbour packaging",
    body: "Looking forward to walking through the facility quote tomorrow at 11.",
    from: "tejas@finconnex.com",
    to: ["marcus.lin@contoso.com"],
    relatedTo: "Marcus Lin",
    status: "Scheduled",
    sentDate: "20/08/2026 11:00 AM",
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
