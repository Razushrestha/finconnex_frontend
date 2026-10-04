import {
  FINANCE_CLIENTS,
  FINANCE_DEALS,
  formatFinanceDate,
  isoFinanceDate,
} from "@/lib/finance/shared";
import {
  normalizeRelatedKind,
  relatedToLabel,
} from "@/lib/related-entity";

export type RelatedFinancePrefill = {
  relatedKind?: string;
  relatedName?: string;
  relatedId?: string;
  email?: string;
};

export type FinanceClientOption = {
  id: string;
  name: string;
  contact: string;
  email: string;
};

export function financeRelatedTo(prefill?: RelatedFinancePrefill) {
  return relatedToLabel(prefill?.relatedKind, prefill?.relatedName);
}

export function financeClientsWithRelated(
  prefill?: RelatedFinancePrefill,
  directory: FinanceClientOption[] = [],
): FinanceClientOption[] {
  const base = directory.length ? directory : [...FINANCE_CLIENTS];
  const kind = normalizeRelatedKind(prefill?.relatedKind);
  const name = prefill?.relatedName?.trim();
  if (!name) return base;
  const id = prefill?.relatedId
    ? `rel-${kind.toLowerCase() || "record"}-${prefill.relatedId}`
    : `rel-${kind.toLowerCase() || "record"}-${name.toLowerCase().replace(/\s+/g, "-")}`;
  const extra: FinanceClientOption = {
    id,
    name,
    contact: name,
    email: prefill?.email?.trim() || "",
  };
  return [
    extra,
    ...base.filter(
      (client) => client.name.toLowerCase() !== name.toLowerCase(),
    ),
  ];
}

export function financeDealOptions(
  prefill?: RelatedFinancePrefill,
  directory: string[] = [],
) {
  const pool = directory.length ? directory : [...FINANCE_DEALS];
  const kind = normalizeRelatedKind(prefill?.relatedKind);
  const name = prefill?.relatedName?.trim();
  const extras =
    kind === "Deal" && name && !pool.includes(name) ? [name] : [];
  return ["", ...extras, ...pool];
}

export function defaultFinanceDealName(prefill?: RelatedFinancePrefill) {
  const kind = normalizeRelatedKind(prefill?.relatedKind);
  const name = prefill?.relatedName?.trim();
  return kind === "Deal" && name ? name : "";
}

export function defaultFinanceTitle(kind: "proposal" | "quote" | "invoice", prefill?: RelatedFinancePrefill) {
  const name = prefill?.relatedName?.trim();
  if (!name) return "";
  if (kind === "proposal") return `${name} – Proposal`;
  if (kind === "quote") return `${name} – Quote`;
  return `${name} – Invoice`;
}

export function defaultFinanceValidUntil(days = 14) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatFinanceDate(date);
}

export function defaultFinanceIsoUntil(days = 14) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoFinanceDate(date);
}
