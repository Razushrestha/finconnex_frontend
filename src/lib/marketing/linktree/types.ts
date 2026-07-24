/** SRS §22 Linktree / Broker profile pages */

import { bookingPages, publicBookUrl } from "@/lib/booking/types";

export type LinktreeStatus = "Draft" | "Live" | "Paused";

export const LINKTREE_STATUSES: LinktreeStatus[] = [
  "Draft",
  "Live",
  "Paused",
];

export type LinktreeLinkType =
  | "Custom"
  | "Booking"
  | "Form"
  | "WhatsApp"
  | "Social"
  | "Email"
  | "Phone";

export const LINKTREE_LINK_TYPES: LinktreeLinkType[] = [
  "Custom",
  "Booking",
  "Form",
  "WhatsApp",
  "Social",
  "Email",
  "Phone",
];

export type LinktreeAccent = "slate" | "forest" | "ocean" | "violet";

export const LINKTREE_ACCENTS: LinktreeAccent[] = [
  "slate",
  "forest",
  "ocean",
  "violet",
];

export const LINKTREE_ACCENT_STYLE: Record<
  LinktreeAccent,
  { wash: string; button: string; avatar: string; icon: string }
> = {
  slate: {
    wash: "from-slate-200/80 via-slate-50 to-white",
    button:
      "bg-white text-slate-900 ring-slate-200/90 hover:bg-slate-900 hover:text-white hover:ring-slate-900",
    avatar: "bg-slate-800 text-white",
    icon: "text-slate-700 hover:bg-slate-900 hover:text-white",
  },
  forest: {
    wash: "from-emerald-100/90 via-stone-50 to-white",
    button:
      "bg-white text-emerald-950 ring-emerald-100 hover:bg-emerald-800 hover:text-white hover:ring-emerald-800",
    avatar: "bg-emerald-800 text-white",
    icon: "text-emerald-800 hover:bg-emerald-800 hover:text-white",
  },
  ocean: {
    wash: "from-sky-100/90 via-slate-50 to-white",
    button:
      "bg-white text-sky-950 ring-sky-100 hover:bg-sky-800 hover:text-white hover:ring-sky-800",
    avatar: "bg-sky-800 text-white",
    icon: "text-sky-800 hover:bg-sky-800 hover:text-white",
  },
  violet: {
    wash: "from-violet-100/80 via-slate-50 to-white",
    button:
      "bg-white text-violet-950 ring-violet-100 hover:bg-violet-700 hover:text-white hover:ring-violet-700",
    avatar: "bg-violet-700 text-white",
    icon: "text-violet-700 hover:bg-violet-700 hover:text-white",
  },
};

export interface LinktreeLink {
  id: string;
  type: LinktreeLinkType;
  label: string;
  url: string;
}

export interface LinktreePage {
  id: string;
  pageId: string;
  /** @deprecated use displayName — kept for list search compatibility */
  title: string;
  displayName: string;
  slug: string;
  status: LinktreeStatus;
  role?: string;
  bio?: string;
  /** Image URL or leave empty for initials */
  avatarUrl?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  /** §8 booking page slug */
  bookingSlug?: string;
  bookingLabel?: string;
  accent: LinktreeAccent;
  links: number;
  linkItems: LinktreeLink[];
  views: number;
  owner: string;
  updatedAt: string;
}

export const LINKTREE_STATUS_STYLE: Record<LinktreeStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Live: "bg-emerald-50 text-emerald-700",
  Paused: "bg-amber-50 text-amber-800",
};

function inferLinkType(url: string): LinktreeLinkType {
  const u = url.toLowerCase();
  if (u.startsWith("/book/") || u.includes("/book/")) return "Booking";
  if (u.startsWith("/f/") || u.includes("/f/")) return "Form";
  if (u.startsWith("mailto:")) return "Email";
  if (u.startsWith("tel:")) return "Phone";
  if (u.includes("wa.me") || u.includes("whatsapp")) return "WhatsApp";
  if (
    u.includes("linkedin") ||
    u.includes("instagram") ||
    u.includes("facebook") ||
    u.includes("twitter") ||
    u.includes("x.com")
  )
    return "Social";
  return "Custom";
}

export function normalizeLink(l: LinktreeLink): LinktreeLink {
  return {
    ...l,
    type: l.type ?? inferLinkType(l.url),
  };
}

export function normalizePage(raw: LinktreePage): LinktreePage {
  const displayName = raw.displayName || raw.title || "Broker";
  return {
    ...raw,
    displayName,
    title: raw.title || displayName,
    accent: raw.accent ?? "violet",
    bookingLabel: raw.bookingLabel || "Book a consult",
    linkItems: (raw.linkItems ?? []).map(normalizeLink),
    links: raw.linkItems?.length ?? raw.links ?? 0,
  };
}

export function whatsappHref(number: string) {
  const digits = number.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
}

export function resolveLinkHref(link: LinktreeLink): string {
  if (link.type === "WhatsApp" && !link.url.startsWith("http")) {
    return whatsappHref(link.url);
  }
  if (link.type === "Email" && !link.url.startsWith("mailto:")) {
    return `mailto:${link.url}`;
  }
  if (link.type === "Phone" && !link.url.startsWith("tel:")) {
    return `tel:${link.url.replace(/\s/g, "")}`;
  }
  return link.url;
}

export function isExternalHref(href: string) {
  return (
    href.startsWith("http") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

export function bookingOptions() {
  return bookingPages
    .filter((p) => p.status === "Live")
    .map((p) => ({
      slug: p.slug,
      label: `${p.title} · /book/${p.slug}`,
      owner: p.owner,
    }));
}

export function signatureLine(page: LinktreePage, origin?: string) {
  const base = origin ?? "";
  const url = `${base}/l/${page.slug}`;
  return `Book with ${page.displayName} → ${url}`;
}

export const linktreePages: LinktreePage[] = [
  {
    id: "lt1",
    pageId: "LT-7001",
    title: "John Smith",
    displayName: "John Smith",
    slug: "john-smith",
    status: "Live",
    role: "Mortgage broker",
    bio: "Helping Sydney buyers and refinancers find the right home loan.",
    phone: "+61 400 111 222",
    email: "john@finconnex.example",
    whatsapp: "+61400111222",
    bookingSlug: "john-discovery",
    bookingLabel: "Book a discovery call",
    accent: "forest",
    links: 3,
    linkItems: [
      {
        id: "l2",
        type: "Form",
        label: "Home loan enquiry",
        url: "/f/home-loan-lead",
      },
      {
        id: "l3",
        type: "Social",
        label: "LinkedIn",
        url: "https://linkedin.com",
      },
      {
        id: "l4",
        type: "Custom",
        label: "Client portal",
        url: "/p/demo",
      },
    ],
    views: 1840,
    owner: "John Smith",
    updatedAt: "19/07/2026",
  },
  {
    id: "lt2",
    pageId: "LT-7002",
    title: "FinConnex Sydney",
    displayName: "FinConnex Sydney",
    slug: "sydney",
    status: "Live",
    role: "CBD office",
    bio: "Connex Group · walk-ins and booked visits.",
    email: "hello@finconnex.example",
    phone: "+61 2 9000 1000",
    bookingSlug: "site-visit-syd",
    bookingLabel: "Book an office visit",
    accent: "ocean",
    links: 2,
    linkItems: [
      {
        id: "l1",
        type: "Email",
        label: "Email the office",
        url: "mailto:hello@finconnex.example",
      },
      {
        id: "l3",
        type: "Form",
        label: "Upload documents",
        url: "/f/doc-intake",
      },
    ],
    views: 620,
    owner: "Roshna Abraham",
    updatedAt: "12/07/2026",
  },
  {
    id: "lt3",
    pageId: "LT-7003",
    title: "Greystone campaign",
    displayName: "Greystone campaign",
    slug: "greystone",
    status: "Draft",
    role: "Campaign hub",
    bio: "Open house and proposal links.",
    accent: "violet",
    links: 2,
    linkItems: [
      {
        id: "l1",
        type: "Form",
        label: "Open house RSVP",
        url: "/f/broker-breakfast",
      },
      {
        id: "l2",
        type: "Custom",
        label: "Proposal pack",
        url: "#",
      },
    ],
    views: 0,
    owner: "Tejas Gokhe",
    updatedAt: "20/07/2026",
  },
];

const STORE_KEY = "marketing:linktree:v2";

function readStore(): LinktreePage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) return (JSON.parse(raw) as LinktreePage[]).map(normalizePage);
    const legacy = sessionStorage.getItem("marketing:linktree");
    if (legacy) {
      const list = (JSON.parse(legacy) as LinktreePage[]).map(normalizePage);
      sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
      return list;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStore(list: LinktreePage[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listLinktreePages(): LinktreePage[] {
  return readStore() ?? linktreePages.map((p) => normalizePage({ ...p }));
}

export function upsertLinktreePage(p: LinktreePage) {
  const list = listLinktreePages();
  const normalized = normalizePage({
    ...p,
    title: p.displayName || p.title,
    links: p.linkItems.length,
  });
  const i = list.findIndex((x) => x.id === normalized.id);
  if (i >= 0) list[i] = normalized;
  else list.unshift(normalized);
  writeStore(list);
  return normalized;
}

export function getLinktreeBySlug(slug: string) {
  return listLinktreePages().find((p) => p.slug === slug);
}

export function getLinktreeById(id: string) {
  return listLinktreePages().find((p) => p.id === id);
}

export function nextLinktreeIds(slugHint: string) {
  const list = listLinktreePages();
  const nums = list
    .map((p) => Number(p.pageId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 7000) + 1;
  const base =
    slugHint
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || `page-${n}`;
  let slug = base;
  let i = 2;
  while (list.some((p) => p.slug === slug)) {
    slug = `${base}-${i++}`;
  }
  return { id: `lt-${Date.now()}`, pageId: `LT-${n}`, slug };
}

export function bumpLinktreeView(slug: string) {
  const page = getLinktreeBySlug(slug);
  if (!page || page.status !== "Live") return;
  upsertLinktreePage({ ...page, views: page.views + 1 });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export { publicBookUrl };
