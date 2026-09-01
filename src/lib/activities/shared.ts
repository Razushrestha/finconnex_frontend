export const ACTIVITY_OWNERS = [
  "John Smith",
  "Shiva Kadhka",
  "Tejas Gokhe",
  "Roshna Abraham",
] as const;

export const RELATED_ENTITY_KINDS = [
  "Lead",
  "Contact",
  "Company",
  "Deal",
] as const;
export type RelatedEntityKind = (typeof RELATED_ENTITY_KINDS)[number];

export interface RelatedTo {
  kind: RelatedEntityKind;
  name: string;
}

/** Sample related records for create forms */
export const RELATED_RECORD_OPTIONS: {
  kind: RelatedEntityKind;
  name: string;
}[] = [
  { kind: "Lead", name: "William Anderson" },
  { kind: "Lead", name: "Chloe Ramirez" },
  { kind: "Contact", name: "Olivia Bennett" },
  { kind: "Contact", name: "Marcus Lin" },
  { kind: "Company", name: "Northwind Traders" },
  { kind: "Company", name: "Fabrikam Inc." },
  { kind: "Deal", name: "Atlas CRM Rollout" },
  { kind: "Deal", name: "Greystone Realty" },
];

export function formatRelatedTo(r?: RelatedTo | string) {
  if (!r) return "";
  if (typeof r === "string") return r;
  return `${r.kind}: ${r.name}`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const AVATAR_COLORS = [
  "bg-amber-200 text-amber-950 dark:bg-amber-800 dark:text-amber-50",
  "bg-pink-200 text-pink-950 dark:bg-pink-800 dark:text-pink-50",
  "bg-teal-200 text-teal-950 dark:bg-teal-800 dark:text-teal-50",
  "bg-blue-200 text-blue-950 dark:bg-blue-800 dark:text-blue-50",
  "bg-violet-200 text-violet-950 dark:bg-violet-800 dark:text-violet-50",
  "bg-emerald-200 text-emerald-950 dark:bg-emerald-800 dark:text-emerald-50",
] as const;

export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 17) % 6;
  return AVATAR_COLORS[h];
}
