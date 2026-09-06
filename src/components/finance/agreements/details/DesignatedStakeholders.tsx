"use client";

import React from "react";
import { Mail, Phone } from "lucide-react";

export function DesignatedStakeholders() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Designated Stakeholders
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold text-xs">
              DC
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">David Chen</p>
              <p className="text-[11px] text-muted-foreground">
                Head of Lending • Harbour Loans
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <Mail className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <Phone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
              ZF
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                Zylo Finance Lead
              </p>
              <p className="text-[11px] text-muted-foreground">
                Account Executive • ReConrex
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-500 border border-violet-500/20">
            Assigned Lead
          </span>
        </div>
      </div>
    </div>
  );
}
