"use client";

import { LeadActivityListPanel } from "./LeadActivityListPanel";
import { LeadQuickActionDialog } from "./LeadQuickActionDialog";
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
