"use client";

import { UserPlus } from "lucide-react";

export function TaskSidebarParticipants() {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Participants
        </h2>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
        >
          <UserPlus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              AS
            </span>
            <div>
              <p className="text-xs font-medium text-foreground">
                Alex Sterling
              </p>
              <p className="text-[10px] text-muted-foreground">Owner</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
              SJ
            </span>
            <div>
              <p className="text-xs font-medium text-foreground">
                Sarah Jenkins
              </p>
              <p className="text-[10px] text-muted-foreground">Collaborator</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
