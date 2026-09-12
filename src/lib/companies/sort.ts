import type { CompanyCardData } from "@/lib/companies/types";

export type CompanySortValue =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | string;

export type CompanySortDirection = "asc" | "desc";

function byName(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function revenueValue(raw?: string) {
  const n = Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Compare two company cards for the Companies page Sort control. */
export function compareCompanyCards(
  a: Pick<CompanyCardData, "name" | "industry" | "owner" | "annualRevenue">,
  b: Pick<CompanyCardData, "name" | "industry" | "owner" | "annualRevenue">,
  sortValue?: CompanySortValue | null,
  direction: CompanySortDirection = "asc",
): number {
  if (!sortValue || sortValue === "Sort") return 0;
  const flip = direction === "desc" ? -1 : 1;
  if (sortValue === "name_asc") return flip * byName(a.name, b.name);
  if (sortValue === "name_desc") return flip * byName(b.name, a.name);
  if (sortValue === "oldest") return flip * byName(a.name, b.name);
  if (sortValue === "newest") return flip * byName(b.name, a.name);
  if (sortValue === "industry") return flip * byName(a.industry ?? "", b.industry ?? "");
  if (sortValue === "owner") return flip * byName(a.owner ?? "", b.owner ?? "");
  if (sortValue === "revenue") {
    return flip * (revenueValue(a.annualRevenue) - revenueValue(b.annualRevenue));
  }
  return flip * byName(a.name, b.name);
}

export function sortCompanyCards<
  T extends Pick<CompanyCardData, "name" | "industry" | "owner" | "annualRevenue">,
>(
  cards: readonly T[],
  sortValue?: CompanySortValue | null,
  direction: CompanySortDirection = "asc",
): T[] {
  if (!sortValue || sortValue === "Sort" || cards.length < 2) {
    return [...cards];
  }
  return [...cards].sort((a, b) =>
    compareCompanyCards(a, b, sortValue, direction),
  );
}
