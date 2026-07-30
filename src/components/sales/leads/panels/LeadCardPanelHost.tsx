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

// Kinds handled by the lightweight single-action dialog (call/sms/email need
// the "open on this device" intent buttons that LeadEditDialog doesn't have).
const QUICK_DIALOG_KINDS: QuickActionKind[] = ["call", "sms", "email"];

// Remaining kinds route into LeadEditDialog's sidebar sections.
// TODO: no "attachment" section exists in LeadEditDialog yet — defaulting to
// "notes" for now. Revisit if attachments need their own tab.
const EDIT_DIALOG_SECTION: Partial<
  Record<QuickActionKind, "appointment" | "tasks" | "notes" | "associated">
> = {
  meeting: "appointment",
  task: "tasks",
  note: "notes",
  attachment: "notes",
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

  if (QUICK_DIALOG_KINDS.includes(panel.kind)) {
    return (
      <LeadQuickActionDialog
        key={`${panel.kind}-${panel.leadId}`}
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        kind={panel.kind}
        leadName={panel.leadName}
        leadEmail={panel.email}
        leadPhone={panel.phone}
        onSuccess={onQuickActionSuccess}
      />
    );
  }

  return (
    <LeadEditDialog
      key={`${panel.kind}-${panel.leadId}`}
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      leadId={panel.leadId}
      leadName={panel.leadName}
      leadEmail={panel.email}
      leadPhone={panel.phone}
      initialSection={EDIT_DIALOG_SECTION[panel.kind]}
      onSuccess={onQuickActionSuccess}
    />
  );
}
