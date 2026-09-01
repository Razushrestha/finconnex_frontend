"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Minus,
  Zap,
  CheckSquare,
  Bell,
  RefreshCw,
  UserCog,
  Repeat,
  Megaphone,
  Printer,
  Combine,
  ArrowRightLeft,
  Trash2,
  Download,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { RecordTagPicker } from "@/components/shared/tags/RecordTags";

interface EntitySelectionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onSendMail?: () => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: () => void;
  onClick?: () => void;
  onRunMacro?: () => void;
  onCreateTask?: () => void;
  onSetReminder?: () => void;
  onMassUpdate?: () => void;
  onChangeOwner?: () => void;
  onCadences?: () => void;
  onAddToCampaigns?: () => void;
  onPrintMailingLabels?: () => void;
  onMailMerge?: () => void;
  onMassConvert?: () => void;
  onDelete?: () => void;
  onExportSelectedRecords?: () => void;
  onCompleteSelected?: () => void;
  onCloneSelected?: () => void;
}

export function EntitySelectionToolbar({
  selectedCount,
  onClear,
  onSendMail,
  onAddTag,
  onRemoveTag,
  onClick,
  onRunMacro,
  onCreateTask,
  onSetReminder,
  onMassUpdate,
  onChangeOwner,
  onCadences,
  onAddToCampaigns,
  onPrintMailingLabels,
  onMailMerge,
  onMassConvert,
  onDelete,
  onExportSelectedRecords,
  onCompleteSelected,
  onCloneSelected,
}: EntitySelectionToolbarProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const moreMenuItems: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick?: () => void;
  }[] = [
    { icon: CheckCircle2, label: "Mark Complete", onClick: onCompleteSelected },
    { icon: Copy, label: "Clone", onClick: onCloneSelected },
    { icon: Zap, label: "Run Macro", onClick: onRunMacro },
    { icon: CheckSquare, label: "Create Task", onClick: onCreateTask },
    { icon: Bell, label: "Set Reminder", onClick: onSetReminder },
    { icon: RefreshCw, label: "Mass Update", onClick: onMassUpdate },
    { icon: UserCog, label: "Change Owner", onClick: onChangeOwner },
    { icon: Repeat, label: "Cadences", onClick: onCadences },
    { icon: Megaphone, label: "Add to Campaigns", onClick: onAddToCampaigns },
    {
      icon: Printer,
      label: "Print Mailing Labels",
      onClick: onPrintMailingLabels,
    },
    { icon: Combine, label: "Mail Merge", onClick: onMailMerge },
    { icon: ArrowRightLeft, label: "Mass Convert", onClick: onMassConvert },
    { icon: Trash2, label: "Delete", onClick: onDelete },
    {
      icon: Download,
      label: "Export Selected Records",
      onClick: onExportSelectedRecords,
    },
  ];

  return (
    <div className="mt-2 flex w-full items-center justify-between">
      <div className="flex items-center gap-3 rounded-md py-1 text-sm">
        <span className="text-foreground/70">
          <span className="font-medium">{selectedCount}</span> Record
          {selectedCount === 1 ? "" : "s"} Selected.{" "}
          <button
            type="button"
            onClick={onClear}
            className="text-red-600 hover:underline"
          >
            Clear
          </button>
        </span>
        <button
          type="button"
          onClick={onSendMail}
          className="rounded-md bg-white hover:bg-white border px-3 py-1"
        >
          Send Mail
        </button>
        {onAddTag ? (
          <RecordTagPicker selected={[]} onAdd={onAddTag} />
        ) : null}
        {onRemoveTag ? (
          <button
            type="button"
            onClick={onRemoveTag}
            className="flex items-center gap-1 rounded-md border bg-white px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Minus className="h-3.5 w-3.5 text-slate-400" />
            Remove tag
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 py-1 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        ) : null}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMoreOpen((v) => !v)}
            className="rounded-full border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isMoreOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsMoreOpen(false)}
              />
              <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-left shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
    {moreMenuItems
              .filter((item) => item.onClick)
              .map(({ icon: Icon, label, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onClick?.();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="rounded-md bg-white hover:bg-white border px-3 py-1"
      >
        Manage field
      </button>
    </div>
  );
}
