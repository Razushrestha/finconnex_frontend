"use client";

import React, { useState } from "react";
import { AgreementDetailsHeader } from "@/components/finance/agreements/details/AgreementDetailsHeader";
import { AgreementOverviewCard } from "@/components/finance/agreements/details/AgreementOverviewCard";
import { AgreementMetricsGrid } from "@/components/finance/agreements/details/AgreementMetricsGrid";
import { AgreementTabNav } from "@/components/finance/agreements/details/AgreementTabNav";
import { AuthorizedServices } from "@/components/finance/agreements/details/AuthorizedServices";
import { ExclusionsRateSchedule } from "@/components/finance/agreements/details/ExclusionsRateSchedule";
import { ContractTerms } from "@/components/finance/agreements/details/ContractTerms";
import { DesignatedStakeholders } from "@/components/finance/agreements/details/DesignatedStakeholders";
import { RecentAutomatedBilling } from "@/components/finance/agreements/details/RecentAutomatedBilling";
import { SendRenewalNoticeModal } from "@/components/finance/agreements/modals/SendRenewalNoticeModal";

export default function AgreementDetailPage() {
  const [activeTab, setActiveTab] = useState("Overview & Scope");
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);

  const handleSendNotice = () => {
    // Add your successful dispatch logic or toast notification here
    console.log("Renewal notice dispatched successfully!");
    setIsRenewalModalOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      {/* 1. Header & Quick Actions */}
      <AgreementDetailsHeader
        agreementId="AGR-2026-01"
        clientName="Harbour Loans Management"
        onSendNotice={() => setIsRenewalModalOpen(true)}
      />

      {/* 2. Main Overview Card */}
      <AgreementOverviewCard
        clientName="Harbour Loans Management"
        entityType="Commercial Entity"
        acn="49 104 293 841"
        agreementRef="AGR-2026-01"
        msaRef="MSA-YL-992"
        description="Brokerage Advisory & Compliance Support Service Agreement"
        executedDate="01 Jan 2026"
        signerName="Marcus Vance (Director)"
        billingCycle="Monthly Retainer"
        paymentMethod="Direct Debit (Autopay)"
      />

      {/* 3. Metrics Summary Grid */}
      <AgreementMetricsGrid />

      {/* 4. Tab Navigation Bar */}
      <AgreementTabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 5. Tab Content Sections */}
      {activeTab === "Overview & Scope" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 spans) */}
          <div className="lg:col-span-2 space-y-6">
            <AuthorizedServices />
            <ExclusionsRateSchedule />
          </div>

          {/* Right Column (1 span) */}
          <div className="space-y-6">
            <ContractTerms />
            <DesignatedStakeholders />
            <RecentAutomatedBilling />
          </div>
        </div>
      )}

      {activeTab !== "Overview & Scope" && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
          Content for{" "}
          <span className="font-semibold text-foreground">{activeTab}</span>{" "}
          goes here.
        </div>
      )}

      {/* Send Renewal Notice Modal Component */}
      <SendRenewalNoticeModal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        onSend={handleSendNotice}
      />
    </div>
  );
}
