/** SRS §16 Resources: internal knowledge hub */

export type ResourceType =
  | "Document"
  | "Video"
  | "Image"
  | "Link"
  | "Template"
  | "Guide"
  | "FAQ";

export type ResourceCategory =
  | "Sales"
  | "Marketing"
  | "Support"
  | "Product"
  | "Training"
  | "Legal";

export type ResourceAccess = "Public" | "Internal" | "Restricted";

export interface ResourceAuditEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
}

export interface ResourceItem {
  id: string;
  resourceId: string;
  name: string;
  type: ResourceType;
  category: ResourceCategory;
  /** File name or external URL */
  fileOrUrl: string;
  isExternalUrl: boolean;
  description?: string;
  tags: string[];
  accessLevel: ResourceAccess;
  uploadedBy: string;
  uploadDate: string;
  downloadCount: number;
  sharedWith?: string;
  audit: ResourceAuditEvent[];
}

export const RESOURCE_TYPES: ResourceType[] = [
  "Document",
  "Video",
  "Image",
  "Link",
  "Template",
  "Guide",
  "FAQ",
];

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  "Sales",
  "Marketing",
  "Support",
  "Product",
  "Training",
  "Legal",
];

export const RESOURCE_ACCESS_LEVELS: ResourceAccess[] = [
  "Public",
  "Internal",
  "Restricted",
];

export const RESOURCE_OWNERS: readonly string[] = [];

export const RESOURCE_TYPE_STYLE: Record<ResourceType, string> = {
  Document: "bg-sky-50 text-sky-700",
  Video: "bg-violet-50 text-violet-700",
  Image: "bg-amber-50 text-amber-800",
  Link: "bg-emerald-50 text-emerald-700",
  Template: "bg-indigo-50 text-indigo-700",
  Guide: "bg-rose-50 text-rose-700",
  FAQ: "bg-slate-100 text-slate-600",
};

export const RESOURCE_ACCESS_STYLE: Record<ResourceAccess, string> = {
  Public: "bg-emerald-50 text-emerald-700",
  Internal: "bg-violet-50 text-violet-700",
  Restricted: "bg-rose-50 text-rose-700",
};

export const RESOURCE_SHARE_TARGETS = [
  "Sales team",
  "Marketing",
  "All staff",
  "Managers",
] as const;

const STORE_KEY = "resources:v1";

export function formatResourceAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatResourceDate(d = new Date()) {
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const resourceItems: ResourceItem[] = [];

function readStore(): ResourceItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as ResourceItem[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: ResourceItem[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listResources(): ResourceItem[] {
  return (
    readStore() ??
    resourceItems.map((r) => ({
      ...r,
      tags: [...r.tags],
      audit: r.audit.map((a) => ({ ...a })),
    }))
  );
}

export function upsertResource(r: ResourceItem) {
  const list = listResources();
  const i = list.findIndex((x) => x.id === r.id);
  if (i >= 0) list[i] = r;
  else list.unshift(r);
  writeStore(list);
  return r;
}

export function deleteResource(id: string) {
  writeStore(listResources().filter((r) => r.id !== id));
}

export function getResourceById(id: string) {
  return listResources().find((r) => r.id === id);
}

function cloneResource(row: ResourceItem): ResourceItem {
  return {
    ...row,
    tags: [...row.tags],
    audit: row.audit.map((a) => ({ ...a })),
  };
}

/** Replace the session store with live CRM rows (empty list is a valid live result). */
export function replaceCrmResources(remote: ResourceItem[]) {
  writeStore(remote.map(cloneResource));
}

export function nextResourceIds() {
  const list = listResources();
  const nums = list
    .map((r) => Number(r.resourceId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 4000) + 1;
  return { id: `res-${Date.now()}`, resourceId: `RES-${n}` };
}

export function appendResourceAudit(
  r: ResourceItem,
  action: string,
  actor: string,
): ResourceItem {
  return {
    ...r,
    audit: [
      ...r.audit,
      { id: `a-${Date.now()}`, at: formatResourceAt(), action, actor },
    ],
  };
}

export function bumpDownload(r: ResourceItem, actor: string): ResourceItem {
  return appendResourceAudit(
    { ...r, downloadCount: r.downloadCount + 1 },
    "Downloaded",
    actor,
  );
}

export function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export function exportResourcesCsv(rows: ResourceItem[]) {
  const header = [
    "Resource ID",
    "Name",
    "Type",
    "Category",
    "File/URL",
    "Access",
    "Tags",
    "Uploaded By",
    "Upload Date",
    "Downloads",
  ];
  const body = rows.map((r) =>
    [
      r.resourceId,
      r.name,
      r.type,
      r.category,
      r.fileOrUrl,
      r.accessLevel,
      r.tags.join(";"),
      r.uploadedBy,
      r.uploadDate,
      r.downloadCount,
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
  a.download = "resources.csv";
  a.click();
  URL.revokeObjectURL(url);
}
