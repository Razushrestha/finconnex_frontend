/** SRS §12 Client Portal */

export type PortalStatus = "Active" | "Inactive" | "Suspended";

export type PortalAccessLevel = "Full" | "Limited" | "Read-only";

export type PortalModule =
  | "Deals"
  | "Documents"
  | "Tasks"
  | "Tickets"
  | "Invoices"
  | "Reports";

export interface PortalActivityEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
}

export interface ClientPortal {
  id: string;
  portalId: string;
  name: string;
  clientId: string;
  clientName: string;
  slug: string;
  status: PortalStatus;
  accessLevel: PortalAccessLevel;
  modules: PortalModule[];
  primaryContactName: string;
  primaryContactEmail: string;
  inviteSentAt?: string;
  lastLoginAt?: string;
  createdBy: string;
  createdAt: string;
  activity: PortalActivityEvent[];
  audit: PortalActivityEvent[];
}

export const PORTAL_STATUSES: PortalStatus[] = [
  "Active",
  "Inactive",
  "Suspended",
];

export const PORTAL_ACCESS_LEVELS: PortalAccessLevel[] = [
  "Full",
  "Limited",
  "Read-only",
];

export const PORTAL_MODULES: PortalModule[] = [
  "Deals",
  "Documents",
  "Tasks",
  "Tickets",
  "Invoices",
  "Reports",
];

export const PORTAL_CLIENTS = [
  {
    id: "c1",
    name: "Greystone Realty",
    contact: "Priya Mehta",
    email: "priya@greystone.example",
  },
  {
    id: "c2",
    name: "Harbour Loans",
    contact: "Marcus Chen",
    email: "marcus@harbour.example",
  },
  {
    id: "c3",
    name: "Northside Mortgage",
    contact: "Aisha Khan",
    email: "aisha@northside.example",
  },
  {
    id: "c4",
    name: "Apex Property Group",
    contact: "Daniel Rossi",
    email: "daniel@apex.example",
  },
] as const;

export const PORTAL_OWNERS = [
  "John Smith",
  "Tejas Gokhe",
  "Roshna Abraham",
  "Shiva Kadhka",
] as const;

const STORE_KEY = "portals:v1";

export function formatPortalAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPortalDate(d = new Date()) {
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function slugifyPortalName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "portal";
}

export function portalPublicPath(slug: string) {
  return `/p/${slug}`;
}

/** Modules visible in public nav — intersection of configured modules only */
export function effectiveModules(p: ClientPortal): PortalModule[] {
  return PORTAL_MODULES.filter((m) => p.modules.includes(m));
}

export function isModuleEnabled(p: ClientPortal, module: PortalModule) {
  return p.modules.includes(module);
}

export function canWriteInPortal(p: ClientPortal) {
  return p.accessLevel === "Full" || p.accessLevel === "Limited";
}

export function canPayInPortal(p: ClientPortal) {
  return p.accessLevel === "Full" && p.modules.includes("Invoices");
}

export function canSignInPortal(p: ClientPortal) {
  return p.accessLevel === "Full" || p.accessLevel === "Limited";
}

export const clientPortals: ClientPortal[] = [
  {
    id: "prt1",
    portalId: "PRT-7001",
    name: "Greystone Client Portal",
    clientId: "c1",
    clientName: "Greystone Realty",
    slug: "greystone",
    status: "Active",
    accessLevel: "Full",
    modules: ["Deals", "Documents", "Tasks", "Tickets", "Invoices", "Reports"],
    primaryContactName: "Priya Mehta",
    primaryContactEmail: "priya@greystone.example",
    inviteSentAt: "10/07/2026 09:00",
    lastLoginAt: "20/07/2026 11:15",
    createdBy: "John Smith",
    createdAt: "08/07/2026",
    activity: [
      { id: "v1", at: "10/07/2026 09:00", action: "Invite sent", actor: "John Smith" },
      { id: "v2", at: "11/07/2026 08:40", action: "Client logged in", actor: "Priya Mehta" },
      { id: "v3", at: "18/07/2026 09:05", action: "Viewed invoice INV-3201", actor: "Priya Mehta" },
      { id: "v4", at: "20/07/2026 11:15", action: "Client logged in", actor: "Priya Mehta" },
    ],
    audit: [
      { id: "a1", at: "08/07/2026 10:00", action: "Created", actor: "John Smith" },
      { id: "a2", at: "08/07/2026 10:10", action: "Status → Active", actor: "John Smith" },
      { id: "a3", at: "10/07/2026 09:00", action: "Invite sent", actor: "John Smith" },
    ],
  },
  {
    id: "prt2",
    portalId: "PRT-7002",
    name: "Harbour self-service",
    clientId: "c2",
    clientName: "Harbour Loans",
    slug: "harbour",
    status: "Active",
    accessLevel: "Limited",
    modules: ["Documents", "Tickets", "Tasks", "Invoices", "Reports"],
    primaryContactName: "Marcus Chen",
    primaryContactEmail: "marcus@harbour.example",
    inviteSentAt: "15/07/2026 14:00",
    createdBy: "Tejas Gokhe",
    createdAt: "14/07/2026",
    activity: [
      { id: "v1", at: "15/07/2026 14:00", action: "Invite sent", actor: "Tejas Gokhe" },
    ],
    audit: [
      { id: "a1", at: "14/07/2026 11:00", action: "Created", actor: "Tejas Gokhe" },
      { id: "a2", at: "14/07/2026 11:20", action: "Access → Limited", actor: "Tejas Gokhe" },
    ],
  },
  {
    id: "prt3",
    portalId: "PRT-7003",
    name: "Apex portal (suspended)",
    clientId: "c4",
    clientName: "Apex Property Group",
    slug: "apex",
    status: "Suspended",
    accessLevel: "Full",
    modules: ["Deals", "Documents", "Invoices", "Tickets"],
    primaryContactName: "Daniel Rossi",
    primaryContactEmail: "daniel@apex.example",
    inviteSentAt: "01/06/2026 10:00",
    lastLoginAt: "05/06/2026 16:00",
    createdBy: "Shiva Kadhka",
    createdAt: "28/05/2026",
    activity: [
      { id: "v1", at: "01/06/2026 10:00", action: "Invite sent", actor: "Shiva Kadhka" },
      { id: "v2", at: "12/06/2026 09:00", action: "Suspended — overdue invoice", actor: "Shiva Kadhka" },
    ],
    audit: [
      { id: "a1", at: "28/05/2026 09:00", action: "Created", actor: "Shiva Kadhka" },
      { id: "a2", at: "12/06/2026 09:00", action: "Status → Suspended", actor: "Shiva Kadhka" },
    ],
  },
];

function readStore(): ClientPortal[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as ClientPortal[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: ClientPortal[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listPortals(): ClientPortal[] {
  return (
    readStore() ??
    clientPortals.map((p) => ({
      ...p,
      modules: [...p.modules],
      activity: p.activity.map((a) => ({ ...a })),
      audit: p.audit.map((a) => ({ ...a })),
    }))
  );
}

export function upsertPortal(p: ClientPortal) {
  const list = listPortals();
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p;
  else list.unshift(p);
  writeStore(list);
  return p;
}

export function deletePortal(id: string) {
  writeStore(listPortals().filter((p) => p.id !== id));
}

export function getPortalById(id: string) {
  return listPortals().find((p) => p.id === id);
}

export function getPortalBySlug(slug: string) {
  return listPortals().find((p) => p.slug === slug);
}

export function nextPortalIds() {
  const list = listPortals();
  const nums = list
    .map((p) => Number(p.portalId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 7000) + 1;
  return { id: `prt-${Date.now()}`, portalId: `PRT-${n}` };
}

export function appendPortalAudit(
  p: ClientPortal,
  action: string,
  actor: string,
): ClientPortal {
  return {
    ...p,
    audit: [
      ...p.audit,
      { id: `a-${Date.now()}`, at: formatPortalAt(), action, actor },
    ],
  };
}

export function appendPortalActivity(
  p: ClientPortal,
  action: string,
  actor: string,
): ClientPortal {
  return {
    ...p,
    activity: [
      {
        id: `v-${Date.now()}`,
        at: formatPortalAt(),
        action,
        actor,
      },
      ...p.activity,
    ],
  };
}

export function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugifyPortalName(base);
  const list = listPortals();
  let n = 2;
  while (list.some((p) => p.slug === slug && p.id !== excludeId)) {
    slug = `${slugifyPortalName(base)}-${n}`;
    n += 1;
  }
  return slug;
}

/* —— Public mock session —— */

function sessionKey(slug: string) {
  return `portal:session:${slug}`;
}

export function getPortalSession(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(sessionKey(slug));
}

export function setPortalSession(slug: string, email: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(sessionKey(slug), email);
}

export function clearPortalSession(slug: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(sessionKey(slug));
}

export const PORTAL_STATUS_STYLE: Record<PortalStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Inactive: "bg-slate-100 text-slate-600",
  Suspended: "bg-rose-50 text-rose-700",
};

export const PORTAL_ACCESS_STYLE: Record<PortalAccessLevel, string> = {
  Full: "bg-violet-50 text-violet-700",
  Limited: "bg-amber-50 text-amber-800",
  "Read-only": "bg-sky-50 text-sky-700",
};

export function exportPortalsCsv(
  rows: ClientPortal[],
  filename = "client-portals.csv",
) {
  const header = [
    "Portal ID",
    "Name",
    "Client",
    "Portal URL",
    "Status",
    "Access Level",
    "Allowed Modules",
    "Primary Contact Name",
    "Primary Contact Email",
    "Last Login",
    "Invite Sent",
  ];
  const body = rows.map((r) =>
    [
      r.portalId,
      r.name,
      r.clientName,
      portalPublicPath(r.slug),
      r.status,
      r.accessLevel,
      r.modules.join(";"),
      r.primaryContactName,
      r.primaryContactEmail,
      r.lastLoginAt ?? "",
      r.inviteSentAt ?? "",
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...body].join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
