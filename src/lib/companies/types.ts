/** SRS §6.3 Companies */

export const COMPANY_STATUSES = [
  "Active",
  "Inactive",
  "Prospect",
  "Customer",
  "Partner",
] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export interface CompanyCardData {
  id: string;
  name: string;
  initials: string;
  website: string;
  industry: string;
  phone: string;
  owner: string;
  ownerId?: string;
  annualRevenue?: string;
  city?: string;
  tags?: string[];
  accentColorClass: string;
  avatarBgClass: string;
  /** Optimistic-concurrency version from CRM PATCH. */
  version?: number;
}

export interface CompanyGroup {
  id: string;
  title: CompanyStatus;
  dotColorClass: string;
  companies: CompanyCardData[];
}

export const COMPANY_GROUPS: CompanyGroup[] = [
  {
    id: "active",
    title: "Active",
    dotColorClass: "bg-sky-500",
    companies: [],
  },
  {
    id: "inactive",
    title: "Inactive",
    dotColorClass: "bg-slate-400",
    companies: [],
  },
  {
    id: "prospect",
    title: "Prospect",
    dotColorClass: "bg-amber-400",
    companies: [],
  },
  {
    id: "customer",
    title: "Customer",
    dotColorClass: "bg-emerald-500",
    companies: [],
  },
  {
    id: "partner",
    title: "Partner",
    dotColorClass: "bg-violet-500",
    companies: [],
  },
];

