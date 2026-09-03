"use client";

import React, { useState } from "react";

export function ContractTermSection() {
  const [autoRenew, setAutoRenew] = useState(true);

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
        <span className="text-[11px] text-muted-foreground">
          Define execution dates & renewal mechanisms
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Effective Start Date
          </label>
          <input
            type="text"
            defaultValue="04/01/2026"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Expiration / Term End Date
          </label>
          <input
            type="text"
            defaultValue="03/31/2027"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Notice of Termination Period
          </label>
          <select className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500">
            <option>30 Days Written Notice</option>
            <option>60 Days Written Notice</option>
            <option>90 Days Written Notice</option>
          </select>
        </div>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={autoRenew}
          onChange={(e) => setAutoRenew(e.target.checked)}
          className="mt-0.5 accent-violet-600"
        />
        <span className="text-xs text-muted-foreground leading-snug">
          <strong className="text-foreground font-semibold">
            Evergreen Auto-Renewal:
          </strong>{" "}
          Automatically renew for successive 12-month periods unless written
          termination notice is served within the prescribed notice period prior
          to the end date.
        </span>
      </label>
    </div>
  );
}
