/** SRS §6.3 Companies */

export const COMPANY_STATUSES = [
  "Active",
  "Inactive",
  "Prospect",
  "Customer",
  "Partner",
] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const OWNERS = [
  "John Smith",
  "Shiva Kadhka",
  "Tejas Gokhe",
  "Roshna Abraham",
] as const;

export interface CompanyCardData {
  id: string;
  name: string;
  initials: string;
  website: string;
  industry: string;
  phone: string;
  owner: string;
  annualRevenue?: string;
  city?: string;
  accentColorClass: string;
  avatarBgClass: string;
}

export interface CompanyGroup {
  id: string;
  title: CompanyStatus;
  dotColorClass: string;
  companies: CompanyCardData[];
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
  data: Omit<CompanyCardData, "avatarBgClass"> & { avatarIndex: number },
): CompanyCardData {
  const { avatarIndex, ...rest } = data;
  return {
    ...rest,
    avatarBgClass: AVATAR_COLORS[avatarIndex % AVATAR_COLORS.length],
  };
}

export const COMPANY_GROUPS: CompanyGroup[] = [
  {
    id: "active",
    title: "Active",
    dotColorClass: "bg-sky-500",
    companies: [
      card({
        id: "co-1",
        name: "Northwind Traders",
        initials: "NT",
        website: "northwind.com",
        industry: "Wholesale",
        phone: "+61 2 9000 1001",
        owner: "John Smith",
        annualRevenue: "$4.2M",
        city: "Sydney",
        accentColorClass: "bg-sky-500",
        avatarIndex: 0,
      }),
      card({
        id: "co-2",
        name: "Contoso Ltd.",
        initials: "CL",
        website: "contoso.com",
        industry: "Technology",
        phone: "+61 3 9000 1002",
        owner: "Shiva Kadhka",
        annualRevenue: "$12.8M",
        city: "Melbourne",
        accentColorClass: "bg-sky-500",
        avatarIndex: 1,
      }),
    ],
  },
  {
    id: "inactive",
    title: "Inactive",
    dotColorClass: "bg-slate-400",
    companies: [
      card({
        id: "co-3",
        name: "Bright Bay Co.",
        initials: "BB",
        website: "brightbay.com",
        industry: "Manufacturing",
        phone: "+61 7 9000 1003",
        owner: "Roshna Abraham",
        annualRevenue: "$1.1M",
        city: "Brisbane",
        accentColorClass: "bg-slate-400",
        avatarIndex: 2,
      }),
    ],
  },
  {
    id: "prospect",
    title: "Prospect",
    dotColorClass: "bg-amber-400",
    companies: [
      card({
        id: "co-4",
        name: "Riverstone Capital",
        initials: "RC",
        website: "riverstone.com.au",
        industry: "Finance",
        phone: "+61 2 9000 1004",
        owner: "Tejas Gokhe",
        annualRevenue: "$8.5M",
        city: "Sydney",
        accentColorClass: "bg-amber-500",
        avatarIndex: 3,
      }),
      card({
        id: "co-5",
        name: "Harborview Supply",
        initials: "HS",
        website: "harborview.com",
        industry: "Logistics",
        phone: "+61 8 9000 1005",
        owner: "John Smith",
        annualRevenue: "$2.4M",
        city: "Perth",
        accentColorClass: "bg-amber-500",
        avatarIndex: 4,
      }),
    ],
  },
  {
    id: "customer",
    title: "Customer",
    dotColorClass: "bg-emerald-500",
    companies: [
      card({
        id: "co-6",
        name: "Fabrikam Inc.",
        initials: "FI",
        website: "fabrikam.com",
        industry: "Retail",
        phone: "+61 2 9000 1006",
        owner: "Shiva Kadhka",
        annualRevenue: "$6.7M",
        city: "Sydney",
        accentColorClass: "bg-emerald-500",
        avatarIndex: 5,
      }),
      card({
        id: "co-7",
        name: "Mitchell Partners",
        initials: "MP",
        website: "mitchellpartners.com",
        industry: "Professional Services",
        phone: "+61 3 9000 1007",
        owner: "Tejas Gokhe",
        annualRevenue: "$3.9M",
        city: "Melbourne",
        accentColorClass: "bg-emerald-500",
        avatarIndex: 6,
      }),
    ],
  },
  {
    id: "partner",
    title: "Partner",
    dotColorClass: "bg-violet-500",
    companies: [
      card({
        id: "co-8",
        name: "Silverhawk Consulting",
        initials: "SC",
        website: "silverhawk.com",
        industry: "Consulting",
        phone: "+61 2 9000 1008",
        owner: "Roshna Abraham",
        annualRevenue: "$5.2M",
        city: "Sydney",
        accentColorClass: "bg-violet-500",
        avatarIndex: 7,
      }),
    ],
  },
];

/** Flat account names for Deal create forms */
export const COMPANY_NAMES = COMPANY_GROUPS.flatMap((g) =>
  g.companies.map((c) => c.name),
);
