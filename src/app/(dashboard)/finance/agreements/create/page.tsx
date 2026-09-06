"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientCounterpartySection } from "@/components/finance/agreements/create/ClientCounterpartySection";
import { ScopeAndSlaSection } from "@/components/finance/agreements/create/ScopeAndSlaSection";
import { FinancialBillingSection } from "@/components/finance/agreements/create/FinancialBillingSection";
import { ContractTermSection } from "@/components/finance/agreements/create/ContractTermSection";
import { ESignatureDocumentsSection } from "@/components/finance/agreements/create/ESignatureDocumentsSection";
import { ArrowLeft, Save, Send } from "lucide-react";

const STORAGE_KEY = "finconnex_agreements";

export default function CreateAgreementPage() {
  const router = useRouter();

  // Centralized form state managing all sections
  const [clientData, setClientData] = useState({
    clientName: "Harbour Loans Management",
    abnAndAddress: "ABN: 48 102 443 391 • 12/24Q Queen St, Brisbane QLD",
    msaRef: "MSA-2026-HLM02",
    signatoryName: "Marcus Vance",
    signatoryEmail: "m.vance@harbourloans.com",
    position: "Managing Director",
  });

  const [scopeData, setScopeData] = useState({
    agreementTitle:
      "Brokerage Advisory, Compliance & Continuous Lending Support SLA",
    categories: [
      "Brokerage Advisory",
      "Compliance & Legal SLA",
      "Loan Packaging",
    ],
    selectedTier: "tier-1",
  });

  const [financialData, setFinancialData] = useState({
    frequency: "monthly",
    amountValue: "3,500.00",
    taxCalc: "GST (10.0%) - Included",
    paymentTerms: "Net 14 Days (Invoice)",
    automateInvoices: true,
  });

  const [termData, setTermData] = useState({
    startDate: "2026-01-04",
    endDate: "2027-03-31",
    terminationNotice: "30 Days Written Notice",
    autoRenew: false,
  });

  const [queueSign, setQueueSign] = useState(false);

  const saveAgreementToStorage = (status: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

      const newAgreement = {
        id: `AGR-2026-${String(existing.length + 1).padStart(2, "0")}`,
        title: scopeData.agreementTitle,
        client: clientData.clientName,
        desc:
          scopeData.categories.join(", ") ||
          "Brokerage Advisory & Compliance Support",
        cycle:
          financialData.frequency.charAt(0).toUpperCase() +
          financialData.frequency.slice(1),
        tier:
          scopeData.selectedTier === "tier-1"
            ? "Tier 1 (24/7 Priority)"
            : "Tier 2 (Standard Business)",
        dates: `${termData.startDate} - ${termData.endDate}`,
        status: status,
        value: `$${financialData.amountValue}`,
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([newAgreement, ...existing]),
      );
    } catch (e) {
      console.error("Failed to save agreement to localStorage:", e);
    }
  };

  const handleSaveDraft = () => {
    saveAgreementToStorage("Under Review");
    router.push("/finance/agreements");
  };

  const handlePublishAndDispatch = () => {
    saveAgreementToStorage("Active");
    router.push("/finance/agreements");
  };

  return (
    <div className=" mx-auto w-full space-y-6 p-6">
      {/* Top Header Navigation & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          Back
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-colors cursor-pointer shadow-sm"
          >
            <Save className="w-3.5 h-3.5 text-muted-foreground" />
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handlePublishAndDispatch}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors cursor-pointer shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            Publish & Dispatch eSign
          </button>
        </div>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        <ClientCounterpartySection
          clientData={clientData}
          onChange={(updated) =>
            setClientData((prev) => ({ ...prev, ...updated }))
          }
        />

        <ScopeAndSlaSection
          scopeData={scopeData}
          onChange={(updated) =>
            setScopeData((prev) => ({ ...prev, ...updated }))
          }
        />

        <FinancialBillingSection
          financialData={financialData}
          onChange={(updated) =>
            setFinancialData((prev) => ({ ...prev, ...updated }))
          }
        />

        <ContractTermSection
          termData={termData}
          onChange={(updated) =>
            setTermData((prev) => ({ ...prev, ...updated }))
          }
        />

        <ESignatureDocumentsSection
          queueSign={queueSign}
          onQueueChange={setQueueSign}
          signatoryEmail={clientData.signatoryEmail}
        />
      </div>
    </div>
  );
}
