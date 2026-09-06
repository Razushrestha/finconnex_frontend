"use client";

import React from "react";
import { Calendar } from "lucide-react";

interface TermData {
  startDate: string;
  endDate: string;
  terminationNotice: string;
  autoRenew: boolean;
}

interface ContractTermSectionProps {
  termData: TermData;
  onChange: (updated: Partial<TermData>) => void;
}

export function ContractTermSection({
  termData,
  onChange,
}: ContractTermSectionProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 font-bold text-xs">
            4
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Contract Term & Renewal Conditions
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Effective Start Date */}
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Effective Start Date
          </label>
          <div className="relative flex items-center">
            <input
              type="date"
              value={termData.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className="w-full pl-3 pr-9 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <Calendar className="w-4 h-4 text-muted-foreground absolute right-3 pointer-events-none" />
          </div>
        </div>

        {/* Expiration / Term End Date */}
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Expiration / Term End Date
          </label>
          <div className="relative flex items-center">
            <input
              type="date"
              value={termData.endDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
              className="w-full pl-3 pr-9 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <Calendar className="w-4 h-4 text-muted-foreground absolute right-3 pointer-events-none" />
          </div>
        </div>

        {/* Notice of Termination Period */}
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Notice of Termination Period
          </label>
          <select
            value={termData.terminationNotice}
            onChange={(e) => onChange({ terminationNotice: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500 cursor-pointer"
          >
            <option>30 Days Written Notice</option>
            <option>60 Days Written Notice</option>
            <option>90 Days Written Notice</option>
          </select>
        </div>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={termData.autoRenew}
          onChange={(e) => onChange({ autoRenew: e.target.checked })}
          className="mt-0.5 accent-violet-600 cursor-pointer"
        />
        <span className="text-xs text-muted-foreground leading-snug">
          <strong className="text-foreground font-semibold">
            Auto-Renewal:
          </strong>{" "}
          Automatically renew for successive 12-month periods unless written
          termination notice is served within the prescribed notice period prior
          to the end date.
        </span>
      </label>
    </div>
  );
}
