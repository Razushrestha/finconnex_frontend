"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskAuditCardProps {
  createdBy?: string;
  createdOn?: string;
  modifiedBy?: string;
  modifiedOn?: string;
  className?: string;
}

function AuditRow({
  label,
  by,
  on,
}: {
  label: string;
  by?: string;
  on?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 flex items-start gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <User className="h-3 w-3" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-slate-800">
            {by || "—"}
          </p>
          <p className="text-[11px] text-slate-500">{on || "—"}</p>
        </div>
      </div>
    </div>
  );
}

export function TaskAuditCard({
  createdBy,
  createdOn,
  modifiedBy,
  modifiedOn,
  className,
}: TaskAuditCardProps) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm",
        className,
      )}
    >
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Record Info
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <AuditRow label="Created by & on" by={createdBy} on={createdOn} />
        <AuditRow label="Modified by & on" by={modifiedBy} on={modifiedOn} />
      </div>
    </div>
  );
}
