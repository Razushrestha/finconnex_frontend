import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import type { DealRecord } from "@/lib/deals/types";

export type DealSortValue =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | string;

export type DealSortDirection = "asc" | "desc";

function byName(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function closeStamp(raw: string | undefined) {
  return parseFlexibleDate(raw)?.getTime() ?? 0;
}

function valueAmount(raw?: string) {
  const n = Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Compare two deals for the Deals page Sort control. */
export function compareDealCards(
  a: Pick<DealRecord, "name" | "closeDate" | "value" | "owner">,
  b: Pick<DealRecord, "name" | "closeDate" | "value" | "owner">,
  sortValue?: DealSortValue | null,
  direction: DealSortDirection = "asc",
): number {
  if (!sortValue || sortValue === "Sort") return 0;
  const flip = direction === "desc" ? -1 : 1;
  if (sortValue === "name_asc") return flip * byName(a.name, b.name);
  if (sortValue === "name_desc") return flip * byName(b.name, a.name);
  if (sortValue === "oldest") {
    return flip * (closeStamp(a.closeDate) - closeStamp(b.closeDate));
  }
  if (sortValue === "newest") {
    return flip * (closeStamp(b.closeDate) - closeStamp(a.closeDate));
  }
  if (sortValue === "value") {
    return flip * (valueAmount(a.value) - valueAmount(b.value));
  }
  if (sortValue === "owner") return flip * byName(a.owner ?? "", b.owner ?? "");
  return flip * byName(a.name, b.name);
}

export function sortDealCards<
  T extends Pick<DealRecord, "name" | "closeDate" | "value" | "owner">,
>(
  cards: readonly T[],
  sortValue?: DealSortValue | null,
  direction: DealSortDirection = "asc",
): T[] {
  if (!sortValue || sortValue === "Sort" || cards.length < 2) {
    return [...cards];
  }
  return [...cards].sort((a, b) =>
    compareDealCards(a, b, sortValue, direction),
  );
}
