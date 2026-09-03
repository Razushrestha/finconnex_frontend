"use client";

import React, { useState } from "react";

interface ClientCounterpartySectionProps {
  onClientChange?: (clientName: string) => void;
}

export function ClientCounterpartySection({
  onClientChange,
}: ClientCounterpartySectionProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedClient, setSelectedClient] = useState(
    "Harbour Loans Management (HLM-AU)",
  );

  const handleClientSelectionChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const val = e.target.value;
    setSelectedClient(val);
    if (onClientChange) {
      onClientChange(
        val.includes("Harbour")
          ? "Harbour Loans Management"
          : "Greystone Realty",
      );
    }
  };

  const handleNewClientNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const val = e.target.value;
    if (onClientChange) {
      onClientChange(val);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 font-bold text-xs">
            1
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Client & Counterparty Information
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="text-xs font-semibold text-violet-600 hover:underline"
        >
          {isAddingNew ? "← Select Existing Client" : "+ New Client Entity"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            {isAddingNew ? "New Client / Entity Name" : "Select Client/Entity"}{" "}
            <span className="text-rose-500">*</span>
          </label>

          {isAddingNew ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="e.g. Apex Global Ventures"
                onChange={handleNewClientNameChange}
                className="w-full px-3 py-2 bg-background border border-violet-500 rounded-lg text-xs text-foreground outline-none ring-1 ring-violet-500"
              />
              <input
                type="text"
                placeholder="ABN & Address details"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
              />
            </div>
          ) : (
            <>
              <select
                value={selectedClient}
                onChange={handleClientSelectionChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
              >
                <option>Harbour Loans Management (HLM-AU)</option>
                <option>Greystone Realty</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                ABN: 48 102 443 391 • 12/24Q Queen St, Brisbane QLD
              </p>
            </>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Master Services Agreement (MSA) Ref
            </label>
            <span className="text-[10px] text-muted-foreground italic">
              Auto-generated
            </span>
          </div>
          <input
            type="text"
            readOnly
            value="MSA-2026-HLM02"
            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-xs text-muted-foreground outline-none font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Primary Client Signatory
          </label>
          <input
            type="text"
            defaultValue="Marcus Vance"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Signatory Email
          </label>
          <input
            type="email"
            defaultValue="m.vance@harbourloans.com"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Position / Role
          </label>
          <input
            type="text"
            defaultValue="Managing Director"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
          />
        </div>
      </div>
    </div>
  );
}
