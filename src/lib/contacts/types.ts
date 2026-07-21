export const CONTACT_SOURCES = [
  "Website",
  "Referral",
  "Social Media",
  "Email Campaign",
  "Other",
] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

export interface ContactRecord {
  id: string;
  name: string;
  initials: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  source: ContactSource;
  accentColorClass: string;
  avatarBgClass: string;
}

export interface ContactGroup {
  id: string;
  title: string;
  dotColorClass: string;
  contacts: ContactRecord[];
}

/** A group's `title` doubles as its type value — this is what the filter
 * panel's "Type" section filters against. */
export const CONTACT_TYPES = [
  "Customer",
  "Prospect",
  "Partner",
  "Vendor",
] as const;

export const CONTACT_GROUPS: ContactGroup[] = [
  {
    id: "customer",
    title: "Customer",
    dotColorClass: "bg-emerald-500",
    contacts: [
      {
        id: "ct-1",
        name: "Olivia Bennett",
        initials: "OB",
        company: "Northwind Traders",
        email: "olivia.bennett@northwind.com",
        phone: "+1 54655 25455",
        location: "Spain",
        source: "Website",
        accentColorClass: "bg-emerald-500",
        avatarBgClass: "bg-emerald-50 text-emerald-600",
      },
      {
        id: "ct-2",
        name: "Marcus Lin",
        initials: "ML",
        company: "Contoso Ltd.",
        email: "marcus.lin@contoso.com",
        phone: "+1 79211 33221",
        location: "United Kingdom",
        source: "Referral",
        accentColorClass: "bg-emerald-500",
        avatarBgClass: "bg-pink-50 text-pink-600",
      },
      {
        id: "ct-3",
        name: "Priya Nair",
        initials: "PN",
        company: "Fabrikam Inc.",
        email: "priya.nair@fabrikam.com",
        phone: "+1 54655 25455",
        location: "India",
        source: "Social Media",
        accentColorClass: "bg-emerald-500",
        avatarBgClass: "bg-teal-50 text-teal-600",
      },
    ],
  },
  {
    id: "prospect",
    title: "Prospect",
    dotColorClass: "bg-blue-600",
    contacts: [
      {
        id: "pr-1",
        name: "Daniel Kim",
        initials: "DK",
        company: "Blue Horizon Media",
        email: "daniel.kim@bluehorizon.com",
        phone: "+1 212 555 0198",
        location: "New York",
        source: "Email Campaign",
        accentColorClass: "bg-blue-600",
        avatarBgClass: "bg-blue-50 text-blue-600",
      },
      {
        id: "pr-2",
        name: "Isabelle Roy",
        initials: "IR",
        company: "Riverstone Capital",
        email: "isabelle.roy@riverstone.com",
        phone: "+1 54655 25455",
        location: "Spain",
        source: "Website",
        accentColorClass: "bg-blue-600",
        avatarBgClass: "bg-indigo-50 text-indigo-600",
      },
      {
        id: "pr-3",
        name: "Rahul Deshmukh",
        initials: "RD",
        company: "Coastal Star Logistics",
        email: "rahul.deshmukh@coastalstar.com",
        phone: "+1 416 555 0111",
        location: "India",
        source: "Other",
        accentColorClass: "bg-blue-600",
        avatarBgClass: "bg-red-50 text-red-600",
      },
    ],
  },
  {
    id: "partner",
    title: "Partner",
    dotColorClass: "bg-amber-400",
    contacts: [
      {
        id: "pt-1",
        name: "Grace Whitfield",
        initials: "GW",
        company: "Novawave Systems",
        email: "grace.whitfield@novawave.com",
        phone: "+1 87545 54503",
        location: "USA",
        source: "Referral",
        accentColorClass: "bg-amber-500",
        avatarBgClass: "bg-amber-50 text-amber-600",
      },
      {
        id: "pt-2",
        name: "Thomas Becker",
        initials: "TB",
        company: "Silverhawk Consulting",
        email: "thomas.becker@silverhawk.com",
        phone: "+1 54655 25455",
        location: "United Kingdom",
        source: "Website",
        accentColorClass: "bg-amber-500",
        avatarBgClass: "bg-purple-50 text-purple-600",
      },
    ],
  },
  {
    id: "vendor",
    title: "Vendor",
    dotColorClass: "bg-rose-500",
    contacts: [
      {
        id: "vn-1",
        name: "Hannah Fischer",
        initials: "HF",
        company: "Harborview Supply Co.",
        email: "hannah.fischer@harborview.com",
        phone: "+1 90321 27845",
        location: "Germany",
        source: "Email Campaign",
        accentColorClass: "bg-rose-500",
        avatarBgClass: "bg-fuchsia-50 text-fuchsia-600",
      },
      {
        id: "vn-2",
        name: "Victor Alonso",
        initials: "VA",
        company: "Bright Bay Materials",
        email: "victor.alonso@brightbay.com",
        phone: "+1 79211 33221",
        location: "United Kingdom",
        source: "Other",
        accentColorClass: "bg-rose-500",
        avatarBgClass: "bg-rose-50 text-rose-600",
      },
    ],
  },
];
