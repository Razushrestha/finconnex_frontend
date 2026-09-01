import {
  FINANCE_CLIENTS,
  FINANCE_DEALS,
  formatFinanceDate,
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
): FinanceClientOption[] {
  const kind = normalizeRelatedKind(prefill?.relatedKind);
  const name = prefill?.relatedName?.trim();
  if (!name) return [...FINANCE_CLIENTS];
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
    ...FINANCE_CLIENTS.filter(
      (client) => client.name.toLowerCase() !== name.toLowerCase(),
    ),
  ];
}

export function financeDealOptions(prefill?: RelatedFinancePrefill) {
  const kind = normalizeRelatedKind(prefill?.relatedKind);
  const name = prefill?.relatedName?.trim();
  const extras =
    kind === "Deal" && name && !(FINANCE_DEALS as readonly string[]).includes(name)
      ? [name]
      : [];
  return ["", ...extras, ...FINANCE_DEALS];
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
