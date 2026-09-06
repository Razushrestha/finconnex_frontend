"use client";

import React, { useState } from "react";

interface ClientData {
  clientName: string;
  abnAndAddress: string;
  msaRef: string;
  signatoryName: string;
  signatoryEmail: string;
  position: string;
}

interface ClientCounterpartySectionProps {
  clientData: ClientData;
  onChange: (updated: Partial<ClientData>) => void;
}

export function ClientCounterpartySection({
  clientData,
  onChange,
}: ClientCounterpartySectionProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleClientSelectionChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const val = e.target.value;
    if (val.includes("Harbour")) {
      onChange({
        clientName: "Harbour Loans Management",
        abnAndAddress: "ABN: 48 102 443 391 • 12/24Q Queen St, Brisbane QLD",
        msaRef: "MSA-2026-HLM02",
        signatoryName: "Marcus Vance",
        signatoryEmail: "m.vance@harbourloans.com",
        position: "Managing Director",
      });
    } else {
      onChange({
        clientName: "Greystone Realty",
        abnAndAddress: "ABN: 12 998 331 204 • 45 King St, Sydney NSW",
        msaRef: "MSA-2026-GR01",
        signatoryName: "Sarah Jenkins",
        signatoryEmail: "s.jenkins@greystone.com",
        position: "Principal Director",
      });
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
          className="text-xs font-semibold text-violet-600 hover:underline cursor-pointer"
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
                value={clientData.clientName}
                onChange={(e) => onChange({ clientName: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-violet-500 rounded-lg text-xs text-foreground outline-none ring-1 ring-violet-500"
              />
              <input
                type="text"
                placeholder="ABN & Address details"
                value={clientData.abnAndAddress}
                onChange={(e) => onChange({ abnAndAddress: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
              />
            </div>
          ) : (
            <>
              <select
                value={clientData.clientName}
                onChange={handleClientSelectionChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
              >
                <option value="Harbour Loans Management">
                  Harbour Loans Management (HLM-AU)
                </option>
                <option value="Greystone Realty">Greystone Realty</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                {clientData.abnAndAddress}
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
            value={clientData.msaRef}
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
            value={clientData.signatoryName}
            onChange={(e) => onChange({ signatoryName: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Signatory Email
          </label>
          <input
            type="email"
            value={clientData.signatoryEmail}
            onChange={(e) => onChange({ signatoryEmail: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Position / Role
          </label>
          <input
            type="text"
            value={clientData.position}
            onChange={(e) => onChange({ position: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
          />
        </div>
      </div>
    </div>
  );
}
