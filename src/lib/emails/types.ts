export type EmailStatus =
  | "Draft"
  | "Scheduled"
  | "Sent"
  | "Delivered"
  | "Opened"
  | "Bounced"
  | "Failed";

export type EmailImportance = "high" | "normal" | "low";

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
  importance?: EmailImportance;
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
  {
    id: "e6",
    subject: "Re: Documents still outstanding",
    body: "Hi, I've uploaded the latest payslips and licence. Can you confirm you received them?",
    from: "olivia.bennett@example.com",
    to: ["shiva.kadhka@finconnex.com"],
    relatedTo: "Olivia Bennett",
    status: "Delivered",
    sentDate: "31/08/2026 12:12 AM",
  },
  {
    id: "e7",
    subject: "Can you send me the file",
    body: "Hi, can you please send me the rate lock confirmation file when you have a moment?",
    from: "william.anderson@example.com",
    to: ["john.smith@finconnex.com"],
    relatedTo: "William Anderson",
    status: "Delivered",
    sentDate: "31/08/2026 08:16 AM",
  },
  {
    id: "e8",
    subject: "Thanks again for the intro",
    body: "Really appreciate the introduction last week — happy to stay in touch.",
    from: "chloe.ramirez@example.com",
    to: ["roshna@finconnex.com"],
    relatedTo: "Chloe Ramirez",
    status: "Delivered",
    sentDate: "30/08/2026 06:45 AM",
  },
  {
    id: "e9",
    subject: "Proposal pack for Greystone",
    body: "Sharing the updated proposal and comparison of the two lenders we discussed.",
    from: "john.smith@finconnex.com",
    to: ["william.anderson@example.com"],
    relatedTo: "William Anderson",
    templateUsed: "Proposal Follow-up",
    status: "Sent",
    sentDate: "28/08/2026 03:20 PM",
  },
  {
    id: "e10",
    subject: "Home loan meeting notes",
    body: "Notes from yesterday's home loan catch-up. Next step is to compare the two packages.",
    from: "tejas@finconnex.com",
    to: ["marcus.lin@contoso.com"],
    relatedTo: "Marcus Lin",
    status: "Opened",
    sentDate: "27/08/2026 11:04 AM",
    openedDate: "27/08/2026 01:12 PM",
  },
  {
    id: "e11",
    subject: "Payslips uploaded",
    body: "Hi team, the remaining documents are now in the portal.",
    from: "katherina.brooks@example.com",
    to: ["roshna@finconnex.com"],
    relatedTo: "Katherina Brooks",
    status: "Delivered",
    sentDate: "26/08/2026 09:30 AM",
  },
  {
    id: "e12",
    subject: "Draft: welcome email",
    body: "Hi Chloe, welcome to FinConnex. I'll send through a checklist shortly.",
    from: "bishnu@nepatronix.com",
    to: ["chloe.ramirez@example.com"],
    relatedTo: "Chloe Ramirez",
    status: "Draft",
    sentDate: "25/08/2026 04:00 PM",
  },
  {
    id: "e13",
    subject: "This week's refinance promotions",
    body: "Unlock a limited flash deal on refinance rates. Unsubscribe anytime from this newsletter.",
    from: "deals@homeloans-weekly.com",
    to: ["john.smith@finconnex.com"],
    relatedTo: "Home Loans Weekly",
    status: "Delivered",
    sentDate: "31/08/2026 07:05 AM",
  },
  {
    id: "e14",
    subject: "Olivia Bennett viewed your profile",
    body: "LinkedIn social notification: Olivia Bennett and 3 others viewed your profile this week.",
    from: "notifications@linkedin.com",
    to: ["roshna@finconnex.com"],
    relatedTo: "LinkedIn",
    status: "Delivered",
    sentDate: "30/08/2026 02:18 PM",
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
