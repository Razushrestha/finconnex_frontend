export const CONTACT_SOURCES = [
  "Website",
  "Referral",
  "Social Media",
  "Email Campaign",
  "Cold Call",
  "Other",
] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

/** SRS §6.2 Status* */
export const CONTACT_STATUSES = [
  "Active",
  "Inactive",
  "Unsubscribed",
] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const OWNERS = [
  "John Smith",
  "Shiva Kadhka",
  "Tejas Gokhe",
  "Roshna Abraham",
] as const;

export interface ContactCardData {
  id: string;
  name: string;
  initials: string;
  company: string;
  email: string;
  phone: string;
  mobile?: string;
  owner: string;
  source: ContactSource;
  createdDate: string;
  accentColorClass: string;
  avatarBgClass: string;
}

export interface ContactGroup {
  id: string;
  title: ContactStatus;
  dotColorClass: string;
  contacts: ContactCardData[];
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

function card(
  data: Omit<ContactCardData, "avatarBgClass"> & { avatarIndex: number },
): ContactCardData {
  const { avatarIndex, ...rest } = data;
  return {
    ...rest,
    avatarBgClass: AVATAR_COLORS[avatarIndex % AVATAR_COLORS.length],
  };
}

export const CONTACT_GROUPS: ContactGroup[] = [
  {
    id: "active",
    title: "Active",
    dotColorClass: "bg-emerald-500",
    contacts: [
      card({
        id: "ct-1",
        name: "Olivia Bennett",
        initials: "OB",
        company: "Northwind Traders",
        email: "olivia.bennett@northwind.com",
        phone: "+61 400 100 001",
        mobile: "+61 411 100 001",
        owner: "John Smith",
        source: "Website",
        createdDate: "23/07/2026",
        accentColorClass: "bg-emerald-500",
        avatarIndex: 0,
      }),
      card({
        id: "ct-2",
        name: "Marcus Lin",
        initials: "ML",
        company: "Contoso Ltd.",
        email: "marcus.lin@contoso.com",
        phone: "+61 400 100 002",
        owner: "Shiva Kadhka",
        source: "Referral",
        createdDate: "23/07/2026",
        accentColorClass: "bg-emerald-500",
        avatarIndex: 1,
      }),
      card({
        id: "ct-3",
        name: "Priya Nair",
        initials: "PN",
        company: "Fabrikam Inc.",
        email: "priya.nair@fabrikam.com",
        phone: "+61 400 100 003",
        owner: "Tejas Gokhe",
        source: "Social Media",
        createdDate: "23/07/2026",
        accentColorClass: "bg-emerald-500",
        avatarIndex: 2,
      }),
    ],
  },
  {
    id: "inactive",
    title: "Inactive",
    dotColorClass: "bg-slate-400",
    contacts: [
      card({
        id: "ct-4",
        name: "Daniel Kim",
        initials: "DK",
        company: "Blue Horizon Media",
        email: "daniel.kim@bluehorizon.com",
        phone: "+61 400 200 001",
        owner: "Roshna Abraham",
        source: "Email Campaign",
        createdDate: "02/06/2026",
        accentColorClass: "bg-slate-400",
        avatarIndex: 3,
      }),
      card({
        id: "ct-5",
        name: "Isabelle Roy",
        initials: "IR",
        company: "Riverstone Capital",
        email: "isabelle.roy@riverstone.com",
        phone: "+61 400 200 002",
        owner: "John Smith",
        source: "Website",
        createdDate: "05/06/2026",
        accentColorClass: "bg-slate-400",
        avatarIndex: 4,
      }),
    ],
  },
  {
    id: "unsubscribed",
    title: "Unsubscribed",
    dotColorClass: "bg-rose-500",
    contacts: [
      card({
        id: "ct-6",
        name: "Rahul Deshmukh",
        initials: "RD",
        company: "Coastal Star Logistics",
        email: "rahul.deshmukh@coastalstar.com",
        phone: "+61 400 300 001",
        owner: "Shiva Kadhka",
        source: "Other",
        createdDate: "20/05/2026",
        accentColorClass: "bg-rose-500",
        avatarIndex: 5,
      }),
      card({
        id: "ct-7",
        name: "Grace Whitfield",
        initials: "GW",
        company: "Novawave Systems",
        email: "grace.whitfield@novawave.com",
        phone: "+61 400 300 002",
        owner: "Tejas Gokhe",
        source: "Referral",
        createdDate: "22/05/2026",
        accentColorClass: "bg-rose-500",
        avatarIndex: 6,
      }),
    ],
  },
];
