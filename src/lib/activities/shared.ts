export const ACTIVITY_OWNERS: readonly string[] = [];

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
  id?: string;
}

/**
 * Related-record options for create forms. Was a hardcoded sample list of
 * fake leads/contacts/companies/deals; real records come from the CRM stores.
 */
export const RELATED_RECORD_OPTIONS: {
  kind: RelatedEntityKind;
  name: string;
}[] = [];

export function formatRelatedTo(r?: RelatedTo | string) {
  if (!r) return "";
  if (typeof r === "string") return r;
  return `${r.kind}: ${r.name}`;
}

export function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

export const AVATAR_COLORS = [
  "bg-amber-200 text-amber-950 dark:bg-amber-800 dark:text-amber-50",
  "bg-pink-200 text-pink-950 dark:bg-pink-800 dark:text-pink-50",
  "bg-teal-200 text-teal-950 dark:bg-teal-800 dark:text-teal-50",
  "bg-blue-200 text-blue-950 dark:bg-blue-800 dark:text-blue-50",
  "bg-violet-200 text-violet-950 dark:bg-violet-800 dark:text-violet-50",
  "bg-emerald-200 text-emerald-950 dark:bg-emerald-800 dark:text-emerald-50",
] as const;

export function avatarColor(name?: string | null) {
  const value = name ?? "";
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h + value.charCodeAt(i) * 17) % 6;
  return AVATAR_COLORS[h];
}
