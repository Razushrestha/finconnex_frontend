export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Social Media",
  "Email Campaign",
  "Other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface ContactCardData {
  id: string;
  name: string;
  initials: string;
  amount: string;
  email: string;
  phone: string;
  location: string;
  source: LeadSource;
  accentColorClass: string;
  avatarBgClass: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  dotColorClass: string;
  leadCount: number;
  totalAmount: string;
  cards: ContactCardData[];
}

export const LEAD_STATUSES = [
  "Contacted",
  "Not Contacted",
  "Closed",
  "Lost",
] as const;

export const LEAD_COLUMNS: KanbanColumn[] = [
  {
    id: "contacted",
    title: "Contacted",
    dotColorClass: "bg-amber-400",
    leadCount: 45,
    totalAmount: "$15,44,540",
    cards: [
      {
        id: "c-1",
        name: "William Anderson",
        initials: "WA",
        amount: "$3,50,000",
        email: "samantha@example.com",
        phone: "+1 54655 25455",
        location: "Spain",
        source: "Website",
        accentColorClass: "bg-amber-500",
        avatarBgClass: "bg-amber-50 text-amber-600",
      },
      {
        id: "c-2",
        name: "Chloe Ramirez",
        initials: "CR",
        amount: "$4,10,000",
        email: "riverstone@example.com",
        phone: "+1 79211 33221",
        location: "United Kingdom",
        source: "Referral",
        accentColorClass: "bg-amber-500",
        avatarBgClass: "bg-pink-50 text-pink-600",
      },
      {
        id: "c-3",
        name: "Arjun Mehta",
        initials: "AM",
        amount: "$3,50,000",
        email: "samantha@example.com",
        phone: "+1 54655 25455",
        location: "Spain",
        source: "Social Media",
        accentColorClass: "bg-amber-500",
        avatarBgClass: "bg-teal-50 text-teal-600",
      },
    ],
  },
  {
    id: "not-contacted",
    title: "Not Contacted",
    dotColorClass: "bg-blue-600",
    leadCount: 32,
    totalAmount: "$10,20,100",
    cards: [
      {
        id: "nc-1",
        name: "Katherina Brooks",
        initials: "KB",
        amount: "$1,90,000",
        email: "bluesky@example.com",
        phone: "+1 212 555 0198",
        location: "New York",
        source: "Email Campaign",
        accentColorClass: "bg-blue-600",
        avatarBgClass: "bg-blue-50 text-blue-600",
      },
      {
        id: "nc-2",
        name: "Jennifer Adams",
        initials: "RS",
        amount: "$3,50,000",
        email: "samantha@example.com",
        phone: "+1 54655 25455",
        location: "Spain",
        source: "Website",
        accentColorClass: "bg-blue-600",
        avatarBgClass: "bg-indigo-50 text-indigo-600",
      },
      {
        id: "nc-3",
        name: "Amit Verma",
        initials: "AV",
        amount: "$4,10,000",
        email: "coastalstar@example.com",
        phone: "+1 416 555 0111",
        location: "India",
        source: "Other",
        accentColorClass: "bg-blue-600",
        avatarBgClass: "bg-red-50 text-red-600",
      },
    ],
  },
  {
    id: "closed",
    title: "Closed",
    dotColorClass: "bg-emerald-500",
    leadCount: 45,
    totalAmount: "$35,44,540",
    cards: [
      {
        id: "cl-1",
        name: "Elizabeth Morgan",
        initials: "EM",
        amount: "$4,20,000",
        email: "novawave@example.com",
        phone: "+1 87545 54503",
        location: "USA",
        source: "Referral",
        accentColorClass: "bg-emerald-500",
        avatarBgClass: "bg-amber-50 text-amber-600",
      },
      {
        id: "cl-2",
        name: "Samantha Reed",
        initials: "SR",
        amount: "$2,80,000",
        email: "silverhawk@example.com",
        phone: "+1 54655 25455",
        location: "United Kingdom",
        source: "Website",
        accentColorClass: "bg-emerald-500",
        avatarBgClass: "bg-purple-50 text-purple-600",
      },
      {
        id: "cl-3",
        name: "Jonathan Mitchell",
        initials: "JM",
        amount: "$1,50,000",
        email: "riverstone@example.com",
        phone: "+1 12454 27845",
        location: "Germany",
        source: "Social Media",
        accentColorClass: "bg-emerald-500",
        avatarBgClass: "bg-cyan-50 text-cyan-600",
      },
    ],
  },
  {
    id: "lost",
    title: "Lost",
    dotColorClass: "bg-rose-500",
    leadCount: 45,
    totalAmount: "$35,44,540",
    cards: [
      {
        id: "l-1",
        name: "Alexandra Bennett",
        initials: "AB",
        amount: "$2,20,000",
        email: "novawave@example.com",
        phone: "+1 27890 17145",
        location: "USA",
        source: "Email Campaign",
        accentColorClass: "bg-rose-500",
        avatarBgClass: "bg-emerald-50 text-emerald-600",
      },
      {
        id: "l-2",
        name: "Amit Khanna",
        initials: "AK",
        amount: "$4,10,000",
        email: "bright.b@example.com",
        phone: "+1 79211 33221",
        location: "United Kingdom",
        source: "Other",
        accentColorClass: "bg-rose-500",
        avatarBgClass: "bg-rose-50 text-rose-600",
      },
      {
        id: "l-3",
        name: "Meera Kapoor",
        initials: "MK",
        amount: "$1,50,000",
        email: "harborview@example.com",
        phone: "+1 90321 27845",
        location: "Germany",
        source: "Referral",
        accentColorClass: "bg-rose-500",
        avatarBgClass: "bg-fuchsia-50 text-fuchsia-600",
      },
    ],
  },
];
