"use client";

import React, { useState } from "react";
import { ClientCounterpartySection } from "./ClientCounterpartySection";
import { ScopeAndSlaSection } from "./ScopeAndSlaSection";
import { FinancialBillingSection } from "./FinancialBillingSection";
import { ContractTermSection } from "./ContractTermSection";
import { ESignatureDocumentsSection } from "./ESignatureDocumentsSection";

interface CreateAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newAgreementData: {
    client: string;
    title: string;
    cycle: string;
    tier: string;
    value: string;
  }) => void;
}

export function CreateAgreementModal({
  isOpen,
  onClose,
  onCreate,
}: CreateAgreementModalProps) {
  // Form state tracking
  const [client, setClient] = useState("Harbour Loans Management");
  const [title, setTitle] = useState(
    "Brokerage Advisory, Compliance & Continuous Lending Support SLA",
  );
  const [cycle] = useState("Monthly Retainer");
  const [tier] = useState("Tier 1 (24/7 Priority)");
  const [value] = useState("$3,500.00");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevents default browser page reload
    onCreate({
      client,
      title,
      cycle,
      tier,
      value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-background border border-border w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 text-violet-600 rounded-xl">
                📄
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">
                    Create Service Agreement
                  </h2>
                  <span className="px-2 py-0.5 bg-violet-500/10 text-violet-600 font-semibold text-[10px] rounded-md">
                    New Draft
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Set up a new recurring retainer, SLA terms, billing schedule,
                  and client contact.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-sm font-bold p-1.5 rounded-lg hover:bg-muted"
            >
              ✕
            </button>
          </div>

          {/* Modal Content Scrollable Area */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <ClientCounterpartySection onClientChange={setClient} />
            <ScopeAndSlaSection />
            <FinancialBillingSection />
            <ContractTermSection />
            <ESignatureDocumentsSection />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold rounded-xl transition-colors"
            >
              Save as Draft
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🚀</span> Create & Send Agreement
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
