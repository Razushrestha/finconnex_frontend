/**
 * Phase 12 — static a11y surface contracts for Kanban card + list.
 * Complements LEAD_CARD_A11Y_CHECKLIST (manual) with file-level CI gates.
 */

export const LEAD_CARD_A11Y_SURFACE_FILES = [
  "src/components/sales/leads/LeadCard.tsx",
  "src/components/sales/leads/LeadListView.tsx",
  "src/components/sales/leads/panels/LeadActivityListPanel.tsx",
  "src/components/sales/leads/panels/LeadQuickActionDialog.tsx",
] as const;

/** Needles each surface file must contain (shared urgency / focus contracts). */
export const LEAD_CARD_A11Y_SURFACE_NEEDLES: Record<
  (typeof LEAD_CARD_A11Y_SURFACE_FILES)[number],
  readonly string[]
> = {
  "src/components/sales/leads/LeadCard.tsx": [
    "URGENCY_WORDS",
    "QUICK_STATE_WORDS",
    "Activity Summary",
    "focus-visible:ring-2",
    "aria-label",
  ],
  "src/components/sales/leads/LeadListView.tsx": [
    "URGENCY_WORDS",
    "QUICK_STATE_WORDS",
    "focus-visible:ring-2",
    "aria-label",
    "Last activity",
  ],
  "src/components/sales/leads/panels/LeadActivityListPanel.tsx": [
    "URGENCY_WORDS",
    "DialogTitle",
  ],
  "src/components/sales/leads/panels/LeadQuickActionDialog.tsx": [
    "DialogTitle",
    "DialogDescription",
  ],
};

export function assertLeadCardA11ySurface(readFile: (rel: string) => string) {
  for (const file of LEAD_CARD_A11Y_SURFACE_FILES) {
    const body = readFile(file);
    for (const needle of LEAD_CARD_A11Y_SURFACE_NEEDLES[file]) {
      if (!body.includes(needle)) {
        throw new Error(`A11y surface ${file} missing "${needle}"`);
      }
    }
  }
}
