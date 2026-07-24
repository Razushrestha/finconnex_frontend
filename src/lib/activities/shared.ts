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
  "bg-amber-50 text-amber-700",
  "bg-pink-50 text-pink-700",
  "bg-teal-50 text-teal-700",
  "bg-blue-50 text-blue-700",
  "bg-violet-50 text-violet-700",
  "bg-emerald-50 text-emerald-700",
] as const;

export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 17) % 6;
  return AVATAR_COLORS[h];
}
