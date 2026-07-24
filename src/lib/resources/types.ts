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

export const RESOURCE_OWNERS = [
  "John Smith",
  "Tejas Gokhe",
  "Roshna Abraham",
  "Shiva Kadhka",
] as const;

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

export const resourceItems: ResourceItem[] = [
  {
    id: "res1",
    resourceId: "RES-4001",
    name: "Home loan pitch deck (Jul 2026)",
    type: "Document",
    category: "Sales",
    fileOrUrl: "FinConnex_Pitch_Deck_Jul2026.pdf",
    isExternalUrl: false,
    description: "Current broker-facing pitch deck. Use this version only.",
    tags: ["pitch", "home-loan", "collateral"],
    accessLevel: "Internal",
    uploadedBy: "John Smith",
    uploadDate: "01/07/2026",
    downloadCount: 48,
    sharedWith: "Sales team",
    audit: [
      { id: "a1", at: "01/07/2026 09:00", action: "Uploaded", actor: "John Smith" },
      { id: "a2", at: "05/07/2026 11:00", action: "Shared with Sales team", actor: "John Smith" },
    ],
  },
  {
    id: "res2",
    resourceId: "RES-4002",
    name: "First-home buyer playbook",
    type: "Guide",
    category: "Training",
    fileOrUrl: "FHB_Playbook_v3.pdf",
    isExternalUrl: false,
    description: "Step-by-step playbook for first-home buyer conversations.",
    tags: ["playbook", "first-home", "training"],
    accessLevel: "Internal",
    uploadedBy: "Roshna Abraham",
    uploadDate: "08/07/2026",
    downloadCount: 31,
    audit: [
      { id: "a1", at: "08/07/2026 10:30", action: "Uploaded", actor: "Roshna Abraham" },
    ],
  },
  {
    id: "res3",
    resourceId: "RES-4003",
    name: "Product overview video",
    type: "Video",
    category: "Product",
    fileOrUrl: "https://video.finconnex.example/product-overview",
    isExternalUrl: true,
    description: "3-minute overview for new brokers.",
    tags: ["video", "onboarding"],
    accessLevel: "Internal",
    uploadedBy: "Tejas Gokhe",
    uploadDate: "12/07/2026",
    downloadCount: 19,
    audit: [
      { id: "a1", at: "12/07/2026 14:00", action: "Uploaded", actor: "Tejas Gokhe" },
    ],
  },
  {
    id: "res4",
    resourceId: "RES-4004",
    name: "Engagement letter template",
    type: "Template",
    category: "Legal",
    fileOrUrl: "Engagement_Letter_Template.docx",
    isExternalUrl: false,
    description: "Standard engagement letter: Legal approved.",
    tags: ["template", "legal", "engagement"],
    accessLevel: "Restricted",
    uploadedBy: "Shiva Kadhka",
    uploadDate: "15/07/2026",
    downloadCount: 12,
    audit: [
      { id: "a1", at: "15/07/2026 09:15", action: "Uploaded", actor: "Shiva Kadhka" },
    ],
  },
  {
    id: "res5",
    resourceId: "RES-4005",
    name: "Marketing brand kit",
    type: "Image",
    category: "Marketing",
    fileOrUrl: "Brand_Kit_Assets.zip",
    isExternalUrl: false,
    description: "Logos, colours, and social templates.",
    tags: ["brand", "assets"],
    accessLevel: "Internal",
    uploadedBy: "Tejas Gokhe",
    uploadDate: "18/07/2026",
    downloadCount: 22,
    audit: [
      { id: "a1", at: "18/07/2026 11:00", action: "Uploaded", actor: "Tejas Gokhe" },
    ],
  },
  {
    id: "res6",
    resourceId: "RES-4006",
    name: "Refinance FAQ for clients",
    type: "FAQ",
    category: "Support",
    fileOrUrl: "https://help.finconnex.example/refinance-faq",
    isExternalUrl: true,
    description: "Client-facing FAQ: safe to share publicly.",
    tags: ["faq", "refinance", "client"],
    accessLevel: "Public",
    uploadedBy: "John Smith",
    uploadDate: "20/07/2026",
    downloadCount: 67,
    sharedWith: "All staff",
    audit: [
      { id: "a1", at: "20/07/2026 08:40", action: "Uploaded", actor: "John Smith" },
      { id: "a2", at: "20/07/2026 08:45", action: "Access → Public", actor: "John Smith" },
    ],
  },
  {
    id: "res7",
    resourceId: "RES-4007",
    name: "Compliance checklist link",
    type: "Link",
    category: "Legal",
    fileOrUrl: "https://intranet.finconnex.example/compliance-checklist",
    isExternalUrl: true,
    description: "Living checklist on intranet.",
    tags: ["compliance", "checklist"],
    accessLevel: "Restricted",
    uploadedBy: "Shiva Kadhka",
    uploadDate: "21/07/2026",
    downloadCount: 8,
    audit: [
      { id: "a1", at: "21/07/2026 16:00", action: "Uploaded", actor: "Shiva Kadhka" },
    ],
  },
];

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
