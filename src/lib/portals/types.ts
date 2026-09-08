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
  /** CRM lead this portal was created from (Send Client Portal). */
  leadId?: string;
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

export const PORTAL_CLIENTS: {
  id: string;
  name: string;
  contact: string;
  email: string;
}[] = [];

export const PORTAL_OWNERS: readonly string[] = [];

const STORE_KEY = "portals:v2";

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

export function portalLoginPath(slug: string) {
  return `${portalPublicPath(slug)}/login`;
}

export function portalAbsoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

/** Modules visible in public nav: intersection of configured modules only */
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

export const clientPortals: ClientPortal[] = [];

function readStore(): ClientPortal[] | null {
  if (typeof window === "undefined") return null;
  try {
    const local = window.localStorage.getItem(STORE_KEY);
    if (local) return JSON.parse(local) as ClientPortal[];
    const session = window.sessionStorage.getItem(STORE_KEY);
    if (session) {
      window.localStorage.setItem(STORE_KEY, session);
      return JSON.parse(session) as ClientPortal[];
    }
    return null;
  } catch {
    return null;
  }
}

function writeStore(list: ClientPortal[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(list);
  window.localStorage.setItem(STORE_KEY, raw);
  window.sessionStorage.setItem(STORE_KEY, raw);
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

export function mergeCrmPortals(remote: ClientPortal[]) {
  if (!remote.length) return;
  const remoteIds = new Set(remote.map((p) => p.id));
  const local = listPortals().filter((p) => !remoteIds.has(p.id));
  writeStore([...remote, ...local]);
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

export function getPortalByLeadId(leadId: string) {
  return listPortals().find((p) => p.leadId === leadId);
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

/*  Public mock session  */

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
