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
  noteType: NoteType;
  createdBy: string;
  isPrivate: boolean;
  isPinned: boolean;
  createdAt: string;
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
