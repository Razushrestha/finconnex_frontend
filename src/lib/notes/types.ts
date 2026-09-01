/** SRS §7.6 Notes */

export type NoteType =
  | "General"
  | "Call Summary"
  | "Meeting Notes"
  | "Follow-up"
  | "Other";

export const NOTE_TYPES: NoteType[] = [
  "General",
  "Call Summary",
  "Meeting Notes",
  "Follow-up",
  "Other",
];

export interface Note {
  id: string;
  title: string;
  body: string;
  relatedTo: string;
  relatedType?: string;
  relatedId?: string;
  noteType: NoteType;
  createdBy: string;
  isPrivate: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface NoteColumn {
  id: string;
  title: NoteType;
  count: number;
  badgeColorClass: string;
  notes: Note[];
}

export const notes: Note[] = [
  {
    id: "n1",
    title: "Project Alpha: Backend Strategy",
    body: "Focus on implementing Django REST Framework with Next.js for the main dashboard. Need to ensure OAuth validation is handled via the SSO endpoint.",
    relatedTo: "Company: Meta - Tronix",
    noteType: "Meeting Notes",
    createdBy: "Bishnu Aryal",
    isPrivate: false,
    isPinned: true,
    createdAt: "17/07/2026 10:00 AM",
  },
  {
    id: "n2",
    title: "Client Feedback: UI Aesthetic",
    body: "The client requested a shift from Inter to Geist font for a sharper, modern feel. Also emphasized high-density UI elements for the stock management dashboard.",
    relatedTo: "Company: Meta - Tronix",
    noteType: "Call Summary",
    createdBy: "Deepak Shrestha",
    isPrivate: true,
    isPinned: false,
    createdAt: "16/07/2026 02:30 PM",
  },
  {
    id: "n3",
    title: "Follow-up: Vendor Payouts",
    body: "Reviewing the revenue tracking charts. Need to verify why the recharts integration is lagging on high-volume data sets.",
    relatedTo: "Deal: Vendor Management",
    noteType: "Follow-up",
    createdBy: "Shiva Kadhka",
    isPrivate: false,
    isPinned: false,
    createdAt: "15/07/2026 09:15 AM",
  },
  {
    id: "n4",
    title: "Innovator-App Architecture",
    body: "Need to structure the reels and comments component directory. Currently encountering issues with .next/dev/static/chunks pathing.",
    relatedTo: "Deal: Innovator-App",
    noteType: "General",
    createdBy: "Deepak Shrestha",
    isPrivate: true,
    isPinned: false,
    createdAt: "14/07/2026 04:00 PM",
  },
  {
    id: "n5",
    title: "Q3 Strategy Meeting",
    body: "Discussing role-based access control (RBAC) tiers: Super Admin, Marketing, Accountant, and Front-Desk. Need to finalize menu permissions by next week.",
    relatedTo: "Company: Administration",
    noteType: "Meeting Notes",
    createdBy: "Bishnu Aryal",
    isPrivate: false,
    isPinned: true,
    createdAt: "12/07/2026 11:30 AM",
  },
  {
    id: "n6",
    title: "Atlas demo talking points",
    body: "Cover pricing tiers, migration timeline, and support SLAs. Bring competitive comparison sheet.",
    relatedTo: "Deal: Atlas CRM Rollout",
    noteType: "Other",
    createdBy: "Tejas Gokhe",
    isPrivate: false,
    isPinned: false,
    createdAt: "18/07/2026 03:20 PM",
  },
  {
    id: "n7",
    title: "Income docs received",
    body: "William emailed payslips for the last two months. Waiting on the employment letter and the latest bank statements before we can complete the checklist.",
    relatedTo: "Lead: William Anderson",
    noteType: "Follow-up",
    createdBy: "John Smith",
    isPrivate: false,
    isPinned: false,
    createdAt: "21/07/2026 09:15 AM",
  },
  {
    id: "n8",
    title: "ID check outstanding",
    body: "Driver licence photo is blurry. Asked the client to re-upload a clear copy of both sides. Passport is already on file.",
    relatedTo: "Lead: William Anderson",
    noteType: "General",
    createdBy: "Priya Shah",
    isPrivate: false,
    isPinned: false,
    createdAt: "22/07/2026 11:40 AM",
  },
  {
    id: "n9",
    title: "Client email: checklist",
    body: "William confirmed he can send the remaining documents by Friday. He asked whether we also need the most recent council rates notice for the security property.",
    relatedTo: "Lead: William Anderson",
    noteType: "Call Summary",
    createdBy: "John Smith",
    isPrivate: false,
    isPinned: false,
    createdAt: "23/07/2026 03:05 PM",
  },
  {
    id: "n10",
    title: "Broker follow-up",
    body: "Called to walk through the missing items. Client will scan the employment letter at work tomorrow morning and upload it to the portal.",
    relatedTo: "Lead: William Anderson",
    noteType: "Call Summary",
    createdBy: "Roshna Abraham",
    isPrivate: false,
    isPinned: false,
    createdAt: "24/07/2026 04:20 PM",
  },
  {
    id: "n11",
    title: "Credit check cleared",
    body: "Equifax came back clean. No defaults. One enquiry from a car lender in March — flagged on the file but should not block pre-approval.",
    relatedTo: "Lead: William Anderson",
    noteType: "General",
    createdBy: "Tejas Gokhe",
    isPrivate: false,
    isPinned: true,
    createdAt: "25/07/2026 10:00 AM",
  },
  {
    id: "n12",
    title: "Portal upload reminder",
    body: "Sent a reminder SMS for the remaining checklist items. If nothing arrives by Monday, schedule another call before we chase the referrer.",
    relatedTo: "Lead: William Anderson",
    noteType: "Follow-up",
    createdBy: "John Smith",
    isPrivate: false,
    isPinned: false,
    createdAt: "27/07/2026 08:45 AM",
  },
  {
    id: "n13",
    title: "Proposal sent",
    body: "Issued the Greystone proposal with two pricing options. Client asked for a comparison against their current lender's cashback offer.",
    relatedTo: "Deal: Greystone Realty",
    noteType: "Follow-up",
    createdBy: "John Smith",
    isPrivate: false,
    isPinned: false,
    createdAt: "20/07/2026 02:10 PM",
  },
  {
    id: "n14",
    title: "Pricing questions",
    body: "They want the break-even if they stay 3 years versus refinance now. Include discharge fees in the next pack.",
    relatedTo: "Deal: Greystone Realty",
    noteType: "Call Summary",
    createdBy: "Shiva Kadhka",
    isPrivate: false,
    isPinned: false,
    createdAt: "22/07/2026 09:50 AM",
  },
  {
    id: "n15",
    title: "Decision expected Friday",
    body: "Directors meet Friday afternoon. Asked us to hold the rate discussion until they confirm which option they prefer.",
    relatedTo: "Deal: Greystone Realty",
    noteType: "Meeting Notes",
    createdBy: "John Smith",
    isPrivate: false,
    isPinned: false,
    createdAt: "24/07/2026 05:15 PM",
  },
];

const COLUMN_COLORS: Record<NoteType, string> = {
  General: "bg-slate-500 text-white",
  "Call Summary": "bg-sky-500 text-white",
  "Meeting Notes": "bg-violet-500 text-white",
  "Follow-up": "bg-amber-500 text-white",
  Other: "bg-emerald-500 text-white",
};

export const noteColumns: NoteColumn[] = NOTE_TYPES.map((type) => {
  const items = notes.filter((n) => n.noteType === type);
  return {
    id: type.toLowerCase().replace(/\s+/g, "-"),
    title: type,
    count: items.length,
    badgeColorClass: COLUMN_COLORS[type],
    notes: items,
  };
});
