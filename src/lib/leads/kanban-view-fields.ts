/**
 * Map Kanban View "Select Fields" ids → Lead Card dynamic field keys.
 * `leadName` is always the card title, never a dynamic row.
 */

import type { LeadCardFieldKey } from "@/lib/leads/lead-card-settings";

/** Kanban settings field id → card field key (null = title-only / skip). */
export const KANBAN_TO_CARD_FIELD: Record<string, LeadCardFieldKey | null> = {
  leadName: null,
  source: "source",
  phone: "phone",
  email: "email",
  leadOwner: "owner",
  tag: "tags",
};

export function kanbanSelectedIdsToCardKeys(
  selectedFieldIds: readonly string[],
): LeadCardFieldKey[] {
  const keys: LeadCardFieldKey[] = [];
  const seen = new Set<string>();
  for (const id of selectedFieldIds) {
    const mapped = KANBAN_TO_CARD_FIELD[id];
    if (mapped == null) continue;
    if (seen.has(mapped)) continue;
    seen.add(mapped);
    keys.push(mapped);
  }
  return keys;
}

export function kanbanShowsOwnerAvatar(
  selectedFieldIds: readonly string[],
): boolean {
  return selectedFieldIds.includes("leadOwner");
}
