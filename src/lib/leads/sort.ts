import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import type { LeadCardData } from "@/lib/leads/types";

export type LeadSortValue =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | string;

function createdStamp(raw: string | undefined) {
  return parseFlexibleDate(raw)?.getTime() ?? 0;
}

/** Compare two lead cards for the Leads page Sort control. */
export function compareLeadCards(
  a: Pick<LeadCardData, "name" | "createdDate">,
  b: Pick<LeadCardData, "name" | "createdDate">,
  sortValue?: LeadSortValue | null,
): number {
  if (!sortValue || sortValue === "Sort") return 0;
  if (sortValue === "name_asc") {
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  }
  if (sortValue === "name_desc") {
    return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
  }
  if (sortValue === "oldest") {
    return createdStamp(a.createdDate) - createdStamp(b.createdDate);
  }
  if (sortValue === "newest") {
    return createdStamp(b.createdDate) - createdStamp(a.createdDate);
  }
  return 0;
}

export function sortLeadCards<T extends Pick<LeadCardData, "name" | "createdDate">>(
  cards: readonly T[],
  sortValue?: LeadSortValue | null,
): T[] {
  if (!sortValue || sortValue === "Sort" || cards.length < 2) {
    return [...cards];
  }
  return [...cards].sort((a, b) => compareLeadCards(a, b, sortValue));
}
