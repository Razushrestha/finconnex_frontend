"use client";

import { ArrowLeft, Check, CheckCircle2, Pencil, X } from "lucide-react";
import type { TaskStatus } from "@/lib/tasks/types";
import { useTaskPageEditing } from "./TaskEditContext";

interface TaskHeaderProps {
  onBack: () => void;
  onUpdateStatus: (status: TaskStatus) => void;
}

export function TaskHeader({ onBack, onUpdateStatus }: TaskHeaderProps) {
  const { editing, beginEdit, saveAll, cancelAll } = useTaskPageEditing();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </button>
      </div>
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
          <button
            type="button"
            onClick={beginEdit}
            className="inline-flex items-center gap-1.5 border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={() => onUpdateStatus("Completed")}
          className="flex items-center gap-1.5 bg-[#5A32A3] px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Close Task
        </button>
      </div>
    </div>
  );
}
