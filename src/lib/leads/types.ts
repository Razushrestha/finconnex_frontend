export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Social Media",
  "Email Campaign",
  "Cold Call",
  "Other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** SRS §6.1 Status* */
export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Unqualified",
  "Converted",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface LeadRecord {
  id: string;
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: string;
  jobTitle?: string;
  source: LeadSource;
  status: LeadStatus;
  owner: string;
  createdDate: string;
  notes?: string;
  productInterest?: string;
  budgetRange?: string;
  estimatedValue?: string;
  initials: string;
  accentColorClass: string;
  avatarBgClass: string;
}

/** Kanban card shape (SRS: Name, Company, Email, Phone, Owner, Created Date) */
export interface LeadCardData {
  id: string;
  name: string;
  initials: string;
  company: string;
  email: string;
  phone: string;
  owner: string;
  createdDate: string;
  source: LeadSource;
  estimatedValue?: string;
  accentColorClass: string;
  avatarBgClass: string;
}

export interface KanbanColumn {
  id: string;
  title: LeadStatus;
  dotColorClass: string;
  leadCount: number;
  totalAmount: string;
  cards: LeadCardData[];
}

const AVATAR_COLORS = [
  "bg-amber-50 text-amber-600",
  "bg-pink-50 text-pink-600",
  "bg-teal-50 text-teal-600",
  "bg-blue-50 text-blue-600",
  "bg-indigo-50 text-indigo-600",
  "bg-violet-50 text-violet-600",
  "bg-emerald-50 text-emerald-600",
  "bg-rose-50 text-rose-600",
];

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function toCard(
  lead: Omit<LeadRecord, "initials" | "accentColorClass" | "avatarBgClass"> & {
    accentColorClass: string;
    avatarIndex: number;
  },
): LeadCardData {
  return {
    id: lead.id,
    name: `${lead.firstName} ${lead.lastName}`,
    initials: initials(lead.firstName, lead.lastName),
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    owner: lead.owner,
    createdDate: lead.createdDate,
    source: lead.source,
    estimatedValue: lead.estimatedValue,
    accentColorClass: lead.accentColorClass,
    avatarBgClass: AVATAR_COLORS[lead.avatarIndex % AVATAR_COLORS.length],
  };
}

export const LEAD_COLUMNS: KanbanColumn[] = [
  {
    id: "new",
    title: "New",
    dotColorClass: "bg-sky-500",
    leadCount: 3,
    totalAmount: "$8,20,000",
    cards: [
      toCard({
        id: "l-n1",
        leadId: "L-001",
        firstName: "William",
        lastName: "Anderson",
        email: "william.a@example.com",
        phone: "+61 400 111 001",
        company: "Anderson Finance",
        source: "Website",
        status: "New",
        owner: "John Smith",
        createdDate: "18/07/2026",
        estimatedValue: "$3,50,000",
        accentColorClass: "bg-sky-500",
        avatarIndex: 0,
      }),
      toCard({
        id: "l-n2",
        leadId: "L-002",
        firstName: "Chloe",
        lastName: "Ramirez",
        email: "chloe.r@example.com",
        phone: "+61 400 111 002",
        company: "Riverstone Capital",
        source: "Referral",
        status: "New",
        owner: "Shiva Kadhka",
        createdDate: "19/07/2026",
        estimatedValue: "$2,10,000",
        accentColorClass: "bg-sky-500",
        avatarIndex: 1,
      }),
      toCard({
        id: "l-n3",
        leadId: "L-003",
        firstName: "Arjun",
        lastName: "Mehta",
        email: "arjun.m@example.com",
        phone: "+61 400 111 003",
        company: "Mehta Advisors",
        source: "Cold Call",
        status: "New",
        owner: "Tejas Gokhe",
        createdDate: "20/07/2026",
        estimatedValue: "$2,60,000",
        accentColorClass: "bg-sky-500",
        avatarIndex: 2,
      }),
    ],
  },
  {
    id: "contacted",
    title: "Contacted",
    dotColorClass: "bg-amber-400",
    leadCount: 3,
    totalAmount: "$9,50,000",
    cards: [
      toCard({
        id: "l-c1",
        leadId: "L-004",
        firstName: "Katherina",
        lastName: "Brooks",
        email: "k.brooks@example.com",
        phone: "+61 400 222 001",
        company: "Blue Sky Media",
        source: "Email Campaign",
        status: "Contacted",
        owner: "Roshna Abraham",
        createdDate: "15/07/2026",
        estimatedValue: "$1,90,000",
        accentColorClass: "bg-amber-500",
        avatarIndex: 3,
      }),
      toCard({
        id: "l-c2",
        leadId: "L-005",
        firstName: "Jennifer",
        lastName: "Adams",
        email: "j.adams@example.com",
        phone: "+61 400 222 002",
        company: "Adams Group",
        source: "Social Media",
        status: "Contacted",
        owner: "John Smith",
        createdDate: "16/07/2026",
        estimatedValue: "$3,50,000",
        accentColorClass: "bg-amber-500",
        avatarIndex: 4,
      }),
      toCard({
        id: "l-c3",
        leadId: "L-006",
        firstName: "Amit",
        lastName: "Verma",
        email: "amit.v@example.com",
        phone: "+61 400 222 003",
        company: "Coastal Star Logistics",
        source: "Website",
        status: "Contacted",
        owner: "Shiva Kadhka",
        createdDate: "17/07/2026",
        estimatedValue: "$4,10,000",
        accentColorClass: "bg-amber-500",
        avatarIndex: 5,
      }),
    ],
  },
  {
    id: "qualified",
    title: "Qualified",
    dotColorClass: "bg-violet-500",
    leadCount: 2,
    totalAmount: "$7,00,000",
    cards: [
      toCard({
        id: "l-q1",
        leadId: "L-007",
        firstName: "Elizabeth",
        lastName: "Morgan",
        email: "e.morgan@example.com",
        phone: "+61 400 333 001",
        company: "Novawave Systems",
        source: "Referral",
        status: "Qualified",
        owner: "Tejas Gokhe",
        createdDate: "12/07/2026",
        estimatedValue: "$4,20,000",
        accentColorClass: "bg-violet-500",
        avatarIndex: 6,
      }),
      toCard({
        id: "l-q2",
        leadId: "L-008",
        firstName: "Samantha",
        lastName: "Reed",
        email: "s.reed@example.com",
        phone: "+61 400 333 002",
        company: "Silverhawk Consulting",
        source: "Website",
        status: "Qualified",
        owner: "John Smith",
        createdDate: "13/07/2026",
        estimatedValue: "$2,80,000",
        accentColorClass: "bg-violet-500",
        avatarIndex: 7,
      }),
    ],
  },
  {
    id: "unqualified",
    title: "Unqualified",
    dotColorClass: "bg-slate-400",
    leadCount: 2,
    totalAmount: "$3,70,000",
    cards: [
      toCard({
        id: "l-u1",
        leadId: "L-009",
        firstName: "Alexandra",
        lastName: "Bennett",
        email: "a.bennett@example.com",
        phone: "+61 400 444 001",
        company: "Bright Bay Co.",
        source: "Other",
        status: "Unqualified",
        owner: "Roshna Abraham",
        createdDate: "10/07/2026",
        estimatedValue: "$2,20,000",
        accentColorClass: "bg-slate-400",
        avatarIndex: 0,
      }),
      toCard({
        id: "l-u2",
        leadId: "L-010",
        firstName: "Meera",
        lastName: "Kapoor",
        email: "m.kapoor@example.com",
        phone: "+61 400 444 002",
        company: "Harborview Supply",
        source: "Cold Call",
        status: "Unqualified",
        owner: "Shiva Kadhka",
        createdDate: "11/07/2026",
        estimatedValue: "$1,50,000",
        accentColorClass: "bg-slate-400",
        avatarIndex: 1,
      }),
    ],
  },
  {
    id: "converted",
    title: "Converted",
    dotColorClass: "bg-emerald-500",
    leadCount: 2,
    totalAmount: "$5,70,000",
    cards: [
      toCard({
        id: "l-v1",
        leadId: "L-011",
        firstName: "Jonathan",
        lastName: "Mitchell",
        email: "j.mitchell@example.com",
        phone: "+61 400 555 001",
        company: "Mitchell Partners",
        source: "Referral",
        status: "Converted",
        owner: "John Smith",
        createdDate: "05/07/2026",
        estimatedValue: "$1,50,000",
        accentColorClass: "bg-emerald-500",
        avatarIndex: 2,
      }),
      toCard({
        id: "l-v2",
        leadId: "L-012",
        firstName: "Priya",
        lastName: "Nair",
        email: "priya.n@example.com",
        phone: "+61 400 555 002",
        company: "Fabrikam Inc.",
        source: "Website",
        status: "Converted",
        owner: "Tejas Gokhe",
        createdDate: "06/07/2026",
        estimatedValue: "$4,20,000",
        accentColorClass: "bg-emerald-500",
        avatarIndex: 3,
      }),
    ],
  },
];

export const OWNERS = [
  "John Smith",
  "Shiva Kadhka",
  "Tejas Gokhe",
  "Roshna Abraham",
] as const;
