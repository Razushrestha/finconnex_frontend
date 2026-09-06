"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCircle2, Pencil, Phone, PhoneCall, X } from "lucide-react";
import { ActivityTimelineButton } from "@/components/activities/ActivityTimelineButton";
import { useTaskPageEditing } from "@/components/activities/tasks/detail/TaskEditContext";

interface CallHeaderProps {
  onBack: () => void;
  backLabel?: string;
  canClose?: boolean;
  canStart?: boolean;
  canDial?: boolean;
  onCloseCall: () => void;
  onStartCall?: () => void;
  onDialCall?: () => void;
  timelineHref?: string;
}

export function CallHeaderSection({
  onBack,
  backLabel = "Back to Calls",
  canClose = true,
  canStart = false,
  canDial = false,
  onCloseCall,
  onStartCall,
  onDialCall,
  timelineHref,
}: CallHeaderProps) {
  const { editing, beginEdit, saveAll, cancelAll } = useTaskPageEditing();
  const [confirmClose, setConfirmClose] = useState(false);

  function confirmCloseCall() {
    onCloseCall();
    setConfirmClose(false);
    toast.success("Call marked as completed.");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 py-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </button>

      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <button
              type="button"
              onClick={cancelAll}
              className="inline-flex items-center gap-1.5 border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={saveAll}
              className="inline-flex items-center gap-1.5 border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
            >
              <Check className="h-3.5 w-3.5" />
              Save
            </button>
          </>
        ) : (
          <>
            {timelineHref ? (
              <ActivityTimelineButton href={timelineHref} />
            ) : null}
            <button
              type="button"
              onClick={beginEdit}
              className="inline-flex items-center gap-1.5 border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-700"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </>
        )}
        {canStart && onStartCall ? (
          <button
            type="button"
            onClick={onStartCall}
            className="inline-flex items-center gap-1.5 border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-700"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Start
          </button>
        ) : null}
        {canDial && onDialCall ? (
          <button
            type="button"
            onClick={onDialCall}
            className="inline-flex items-center gap-1.5 border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-700"
          >
            <Phone className="h-3.5 w-3.5" />
            Dial
          </button>
        ) : null}
        {canClose ? (
          <button
            type="button"
            onClick={() => setConfirmClose(true)}
            className="flex items-center gap-1.5 bg-[#5A32A3] px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Close Call
          </button>
        ) : null}
      </div>

      {confirmClose ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-call-title"
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <h2
              id="close-call-title"
              className="text-[15px] font-semibold text-slate-900"
            >
              Do you want to close the call?
            </h2>
            <p className="mt-1.5 text-[13px] text-slate-500">
              This will mark the call as completed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmCloseCall}
                className="inline-flex h-9 items-center rounded-lg bg-[#5A32A3] px-4 text-[13px] font-medium text-white hover:opacity-90"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
