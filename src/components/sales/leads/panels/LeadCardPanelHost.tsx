"use client";

import { LeadActivityListPanel } from "./LeadActivityListPanel";
import { LeadQuickActionDialog } from "./LeadQuickActionDialog";
import { LeadEditDialog } from "./LeadEditDialog";
import type { QuickActionKind } from "@/lib/leads/panel-actions";
import type { LeadStatus } from "@/lib/leads/types";

export type LeadPanelState =
  | {
      type: "activity-summary";
      leadId: string;
      leadName: string;
      status: LeadStatus;
    }
  | {
      type: "last-activity";
      leadId: string;
      leadName: string;
      status: LeadStatus;
    }
  | {
      type: "quick-action";
      kind: QuickActionKind;
      leadId: string;
      leadName: string;
      status: LeadStatus;
      email?: string;
      phone?: string;
    };

interface LeadCardPanelHostProps {
  panel: LeadPanelState | null;
  onClose: () => void;
  revision: number;
  onQuickActionSuccess?: (message: string) => void;
}

const EDIT_DIALOG_SECTION: Partial<
  Record<
    QuickActionKind,
    "appointment" | "tasks" | "notes" | "associated" | "sms"
  >
> = {
  meeting: "appointment",
  task: "tasks",
  note: "notes",
  attachment: "associated",
  sms: "sms",
};

export function LeadCardPanelHost({
  panel,
  onClose,
  revision,
  onQuickActionSuccess,
}: LeadCardPanelHostProps) {
  if (!panel) return null;

  if (panel.type === "activity-summary" || panel.type === "last-activity") {
    return (
      <LeadActivityListPanel
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        leadName={panel.leadName}
        mode={panel.type === "activity-summary" ? "summary" : "timeline"}
        revision={revision}
      />
    );
  }

  const { kind, leadId, leadName, email, phone } = panel;

  // Call stays on softphone from the card; if host still receives it, keep log dialog.
  if (kind === "call") {
    return (
      <LeadQuickActionDialog
        key={`${kind}-${leadId}`}
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        kind={panel.kind}
        leadName={panel.leadName}
        leadEmail={panel.email}
        leadPhone={panel.phone}
        leadId={panel.leadId}
        onSuccess={onQuickActionSuccess}
        presentation="drawer"
      />
    );
  }

  if (kind === "email") {
    return (
      <LeadQuickActionDialog
        key={`${kind}-${leadId}`}
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        kind={kind}
        leadName={leadName}
        leadEmail={email}
        leadPhone={phone}
        onSuccess={onQuickActionSuccess}
        presentation="drawer"
      />
    );
  }

  if (
    kind === "meeting" ||
    kind === "task" ||
    kind === "note" ||
    kind === "attachment" ||
    kind === "sms"
  ) {
    return (
      <LeadEditDialog
        key={`${kind}-${leadId}`}
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        leadId={leadId}
        leadName={leadName}
        leadEmail={email}
        leadPhone={phone}
        initialSection={EDIT_DIALOG_SECTION[kind]}
        onSuccess={onQuickActionSuccess}
        presentation="drawer"
      />
    );
  }

  return null;
}
