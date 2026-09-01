"use client";

import { MentionTextarea } from "@/components/shared/MentionTextarea";
import { RelatedInternalNotes } from "@/components/shared/RelatedInternalNotes";
import { useState } from "react";
import { X } from "lucide-react";
import type { CompanyQuickActionKind } from "@/components/sales/companies/CompanyCard";

export interface CompanyQuickActionPanelState {
  type: "quick-action";
  kind: CompanyQuickActionKind;
  companyId: string;
  companyName: string;
  website: string;
  phone: string;
}

export type CompanyPanelState = CompanyQuickActionPanelState;

interface CompanyCardPanelHostProps {
  panel: CompanyPanelState | null;
  onClose: () => void;
  onQuickActionSuccess: (message: string) => void;
}

const PANEL_TITLES: Record<CompanyQuickActionKind, string> = {
  call: "Log a Call",
  email: "Send Email",
  sms: "Send SMS",
  meeting: "Schedule Appointment",
  task: "Create Task",
  note: "Add a Note",
  attachment: "Add Attachment",
};

export function CompanyCardPanelHost({
  panel,
  onClose,
  onQuickActionSuccess,
}: CompanyCardPanelHostProps) {
  if (!panel) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative flex h-full w-96 flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {PANEL_TITLES[panel.kind]}
            </h2>
            <p className="text-xs text-slate-500">{panel.companyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {panel.kind === "note" ? (
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <RelatedInternalNotes
              relatedTo={`Company: ${panel.companyName}`}
              onNotify={(message) => onQuickActionSuccess(message)}
            />
          </div>
        ) : (
          <QuickActionForm
            panel={panel}
            onCancel={onClose}
            onSubmit={(message) => {
              onQuickActionSuccess(message);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

const FIELD_CONFIG: Record<
  CompanyQuickActionKind,
  {
    label: string;
    placeholder: (p: CompanyQuickActionPanelState) => string;
    successVerb: string;
  }
> = {
  call: {
    label: "Call notes",
    placeholder: (p) => `Notes from your call regarding ${p.companyName}...`,
    successVerb: "Logged call with",
  },
  email: {
    label: "Message",
    placeholder: (p) => `Write your email to ${p.website || p.companyName}...`,
    successVerb: "Sent email to",
  },
  sms: {
    label: "Message",
    placeholder: (p) => `Write your message to ${p.companyName}...`,
    successVerb: "Sent message to",
  },
  note: {
    label: "Note",
    placeholder: (p) => `Add a note about ${p.companyName}...`,
    successVerb: "Added note for",
  },
  task: {
    label: "Task",
    placeholder: (p) => `What needs to be done for ${p.companyName}?`,
    successVerb: "Created task for",
  },
  meeting: {
    label: "Details",
    placeholder: (p) => `Appointment details with ${p.companyName}...`,
    successVerb: "Scheduled appointment with",
  },
  attachment: {
    label: "Details",
    placeholder: (p) => `Attachment details for ${p.companyName}...`,
    successVerb: "Added attachment for",
  },
};

function QuickActionForm({
  panel,
  onCancel,
  onSubmit,
}: {
  panel: CompanyQuickActionPanelState;
  onCancel: () => void;
  onSubmit: (message: string) => void;
}) {
  const [value, setValue] = useState("");
  const config = FIELD_CONFIG[panel.kind];

  return (
    <div className="flex flex-1 flex-col justify-between overflow-y-auto px-5 py-5">
      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {config.label}
        </label>
        <MentionTextarea
          autoFocus
          value={value}
          onChange={setValue}
          rows={6}
          placeholder={`${config.placeholder(panel)} Type @ to assign someone.`}
          className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!value.trim()}
          onClick={() => onSubmit(`${config.successVerb} ${panel.companyName}`)}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {PANEL_TITLES[panel.kind]}
        </button>
      </div>
    </div>
  );
}
