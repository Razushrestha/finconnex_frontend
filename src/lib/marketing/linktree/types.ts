/** SRS §22 Linktree-style broker pages */

export type LinktreeStatus = "Draft" | "Live" | "Paused";

export const LINKTREE_STATUSES: LinktreeStatus[] = [
  "Draft",
  "Live",
  "Paused",
];

export interface LinktreeLink {
  id: string;
  label: string;
  url: string;
}

export interface LinktreePage {
  id: string;
  pageId: string;
  title: string;
  slug: string;
  status: LinktreeStatus;
  links: number;
  linkItems: LinktreeLink[];
  views: number;
  owner: string;
  updatedAt: string;
  bio?: string;
}

export const linktreePages: LinktreePage[] = [
  {
    id: "lt1",
    pageId: "LT-7001",
    title: "John Smith — Broker links",
    slug: "john-smith",
    status: "Live",
    links: 4,
    linkItems: [
      { id: "l1", label: "Book a consult", url: "/book/john-smith" },
      { id: "l2", label: "Home loan enquiry", url: "/f/home-loan-lead" },
      { id: "l3", label: "LinkedIn", url: "https://linkedin.com" },
      { id: "l4", label: "FinConnex portal", url: "/" },
    ],
    views: 1840,
    owner: "John Smith",
    updatedAt: "19/07/2026",
    bio: "Mortgage broker · Sydney",
  },
  {
    id: "lt2",
    pageId: "LT-7002",
    title: "FinConnex Sydney office",
    slug: "sydney",
    status: "Live",
    links: 3,
    linkItems: [
      { id: "l1", label: "Contact us", url: "mailto:hello@finconnex.example" },
      { id: "l2", label: "Book office visit", url: "/book/sydney" },
      { id: "l3", label: "Upload documents", url: "/f/doc-intake" },
    ],
    views: 620,
    owner: "Roshna Abraham",
    updatedAt: "12/07/2026",
    bio: "Connex Group · CBD",
  },
  {
    id: "lt3",
    pageId: "LT-7003",
    title: "Greystone campaign hub",
    slug: "greystone",
    status: "Draft",
    links: 2,
    linkItems: [
      { id: "l1", label: "Open house RSVP", url: "/f/broker-breakfast" },
      { id: "l2", label: "Proposal pack", url: "#" },
    ],
    views: 0,
    owner: "Tejas Gokhe",
    updatedAt: "20/07/2026",
  },
];

const STORE_KEY = "marketing:linktree";

function readStore(): LinktreePage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as LinktreePage[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: LinktreePage[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listLinktreePages(): LinktreePage[] {
  return readStore() ?? linktreePages.map((p) => ({ ...p }));
}

export function upsertLinktreePage(p: LinktreePage) {
  const list = listLinktreePages();
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p;
  else list.unshift(p);
  writeStore(list);
  return p;
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
