/** Tenant-defined custom fields (Settings → CRM Configuration). */

export const CUSTOM_FIELD_ENTITY_TYPES = ["Lead", "Contact", "Deal"] as const;
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITY_TYPES)[number];

export const CUSTOM_FIELD_TYPES = ["text", "number", "select", "date"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export interface CustomFieldDef {
  id: string;
  entity: CustomFieldEntity;
  /** Stable key used as `cf:<key>` on Lead Card. */
  key: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  active: boolean;
}

export const customFieldsSeed: CustomFieldDef[] = [
  {
    id: "cf-1",
    entity: "Lead",
    key: "leadScore",
    label: "Lead score",
    type: "number",
    active: true,
  },
  {
    id: "cf-2",
    entity: "Lead",
    key: "referralSource",
    label: "Referral source",
    type: "select",
    options: ["Partner", "Website", "Walk-in", "Other"],
    active: true,
  },
  {
    id: "cf-3",
    entity: "Lead",
    key: "preferredBranch",
    label: "Preferred branch",
    type: "text",
    active: true,
  },
  {
    id: "cf-4",
    entity: "Contact",
    key: "preferredName",
    label: "Preferred name",
    type: "text",
    active: true,
  },
];

export function cardFieldKeyForCustom(key: string): string {
  return `cf:${key}`;
}

export function parseCustomCardFieldKey(
  fieldKey: string,
): string | null {
  if (!fieldKey.startsWith("cf:")) return null;
  return fieldKey.slice(3) || null;
}
