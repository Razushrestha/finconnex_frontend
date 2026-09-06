"use client";

import React, { useState } from "react";
import { Check, Plus } from "lucide-react";

interface Recipient {
  id: string;
  name: string;
  role: string;
  email: string;
  selected: boolean;
}

export function RenewalRecipientsSection() {
  const [recipients, setRecipients] = useState<Recipient[]>([
    {
      id: "1",
      name: "David Chen",
      role: "Primary Signatory • Head of Lending",
      email: "d.chen@harbourloans.com",
      selected: true,
    },
    {
      id: "2",
      name: "Marcus Vance",
      role: "Managing Director & Exec Signatory",
      email: "m.vance@harbourloans.com",
      selected: true,
    },
  ]);

  const toggleRecipient = (id: string) => {
    setRecipients(
      recipients.map((r) =>
        r.id === id ? { ...r, selected: !r.selected } : r,
      ),
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground font-semibold text-[11px] flex items-center justify-center">
            1
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Counterparty & Notice Recipients
          </h3>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          Harbour Loans Management • ACN 49 104 293 841
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {recipients.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleRecipient(item.id)}
            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
              item.selected
                ? "bg-primary/5 border-primary/30"
                : "bg-muted/30 border-border"
            }`}
          >
            <div
              className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center transition-colors border ${
                item.selected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              {item.selected && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">{item.name}</p>
              <p className="text-[11px] text-muted-foreground">{item.role}</p>
              <p className="text-[11px] font-medium text-primary">
                {item.email}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add CC recipient [Finance / Legal Counsel]
        </button>
        <span className="text-[10px] text-muted-foreground">
          All recipients will receive an authenticated audit trail
        </span>
      </div>
    </div>
  );
}
