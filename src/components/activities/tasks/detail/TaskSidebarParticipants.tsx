"use client";

import { UserPlus } from "lucide-react";

export function TaskSidebarParticipants() {
  return (
    <section className="border-b border-slate-100 py-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Participants
        </h2>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-700"
        >
          <UserPlus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3ECFB] text-xs font-bold text-[#5A32A3]">
            AS
          </span>
          <div>
            <p className="text-xs font-medium text-slate-800">Alex Sterling</p>
            <p className="text-[10px] text-slate-400">Owner</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
            SJ
          </span>
          <div>
            <p className="text-xs font-medium text-slate-800">Sarah Jenkins</p>
            <p className="text-[10px] text-slate-400">Collaborator</p>
          </div>
        </div>
      </div>
    </section>
  );
}
