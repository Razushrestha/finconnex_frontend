export type NoteType =
  | "General"
  | "Call Summary"
  | "Meeting Notes"
  | "Follow-up"
  | "Other";

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
    relatedTo: "Meta - Tronix",
    noteType: "Meeting Notes",
    createdBy: "Bishnu",
    isPrivate: false,
    isPinned: true,
    createdAt: "17/07/2026 10:00 AM",
  },
  {
    id: "n2",
    title: "Client Feedback: UI Aesthetic",
    body: "The client requested a shift from Inter to Geist font for a sharper, modern feel. Also emphasized high-density UI elements for the stock management dashboard.",
    relatedTo: "Meta - Tronix",
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
    relatedTo: "Vendor Management",
    noteType: "Follow-up",
    createdBy: "Shiva Khadka",
    isPrivate: false,
    isPinned: false,
    createdAt: "15/07/2026 09:15 AM",
  },
  {
    id: "n4",
    title: "Innovator-App Architecture",
    body: "Need to structure the reels and comments component directory. Currently encountering issues with .next/dev/static/chunks pathing.",
    relatedTo: "Innovator-App",
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
    relatedTo: "Administration",
    noteType: "Meeting Notes",
    createdBy: "Bishnu",
    isPrivate: false,
    isPinned: false,
    createdAt: "12/07/2026 11:30 AM",
  },
];

export const noteColumns: NoteColumn[] = [
  {
    id: "general",
    title: "General",
    count: 38,
    badgeColorClass: "bg-slate-400 text-white",
    notes: notes.filter((n) => n.noteType === "General"),
  },
  {
    id: "call-summary",
    title: "Call Summary",
    count: 64,
    badgeColorClass: "bg-sky-500 text-white",
    notes: notes.filter((n) => n.noteType === "Call Summary"),
  },
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    count: 52,
    badgeColorClass: "bg-indigo-500 text-white",
    notes: notes.filter((n) => n.noteType === "Meeting Notes"),
  },
  {
    id: "follow-up",
    title: "Follow-up",
    count: 27,
    badgeColorClass: "bg-amber-400 text-white",
    notes: notes.filter((n) => n.noteType === "Follow-up"),
  },
  {
    id: "other",
    title: "Other",
    count: 9,
    badgeColorClass: "bg-emerald-400 text-white",
    notes: notes.filter((n) => n.noteType === "Other"),
  },
];
