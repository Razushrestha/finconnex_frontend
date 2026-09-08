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
  "Bounced",
  "Archived",
] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];


export interface ContactCardData {
  id: string;
  name: string;
  initials: string;
  company: string;
  email: string;
  phone: string;
  mobile?: string;
  owner: string;
  source?: ContactSource;
  createdDate: string;
  accentColorClass: string;
  avatarBgClass: string;
  /** Linked deal record ids (SRS contact ↔ deal). */
  dealIds?: string[];
  tags?: string[];
  firstName?: string;
  lastName?: string;
  ownerId?: string;
  companyId?: string;
  jobTitle?: string;
  department?: string;
  linkedinUrl?: string;
  lifecycleStage?: string;
  doNotContact?: boolean;
  notes?: string;
}

export interface ContactGroup {
  id: string;
  title: ContactStatus;
  dotColorClass: string;
  contacts: ContactCardData[];
}

export const CONTACT_GROUPS: ContactGroup[] = [
  { id: "active", title: "Active", dotColorClass: "bg-emerald-500", contacts: [] },
  { id: "inactive", title: "Inactive", dotColorClass: "bg-slate-400", contacts: [] },
  {
    id: "unsubscribed",
    title: "Unsubscribed",
    dotColorClass: "bg-rose-500",
    contacts: [],
  },
  { id: "bounced", title: "Bounced", dotColorClass: "bg-amber-500", contacts: [] },
  { id: "archived", title: "Archived", dotColorClass: "bg-zinc-400", contacts: [] },
];

export function emptyContactGroups(): ContactGroup[] {
  return CONTACT_GROUPS.map((group) => ({ ...group, contacts: [] }));
}
