"use client";

import React from "react";
import { AuthorizedServices } from "@/components/finance/agreements/details/AuthorizedServices";
import { ExclusionsRateSchedule } from "@/components/finance/agreements/details/ExclusionsRateSchedule";
import { ContractTerms } from "@/components/finance/agreements/details/ContractTerms";
import { DesignatedStakeholders } from "@/components/finance/agreements/details/DesignatedStakeholders";
import { RecentAutomatedBilling } from "@/components/finance/agreements/details/RecentAutomatedBilling";
import { BankRemittanceDetails } from "./billings/BankRemittanceDetails";
import { InvoicesTable } from "./billings/InvoicesTable";
import { BillingMetricsGrid } from "./billings/BillingMetricsGrid";
import { SLAMetricsGrid } from "./sla/SLAMetricsGrid";
import { SLATierMatrix } from "./sla/SLATierMatrix";
import { IncidentLogTable } from "./sla/IncidentLogTable";
import { DeliverablesProgressCard } from "./deliverables/DeliverablesProgressCard";
import { KeyMilestonesList } from "./deliverables/KeyMilestonesList";
import { AdvisoryBurnDownCard } from "./deliverables/AdvisoryBurnDownCard";
import { ExecutionStatusBanner } from "./documents/ExecutionStatusBanner";
import { DocumentRepositoryList } from "./documents/DocumentRepositoryList";
import { ESignatureAuditTrail } from "./documents/ESignatureAuditTrial";
import { AuditHistoryView } from "./audit/AuditHistoryView";

interface AgreementData {
  id: string;
  clientName: string;
  status: string;
  tier: string;
  renewalText: string;
  entityType: string;
  acn: string;
  msaRef: string;
  description: string;
  executedDate: string;
  signerName: string;
  billingCycle: string;
  paymentMethod: string;
  billingMetrics?: {
    totalBilled: string;
    totalCycles: string;
    nextDueDate: string;
    nextAmount: string;
  };
  invoices?: Array<{
    id: string;
    date: string;
    desc: string;
    amount: string;
    method: string;
    status: string;
    paidDate: string;
  }>;
  bankDetails?: {
    bankName: string;
    bsb: string;
    account: string;
    remittanceEmail: string;
    abn: string;
  };
  slaMetrics?: {
    responseCompliance?: string;
    avgFirstResponse?: string;
    resolutionCompliance?: string;
    activeTickets?: string;
  };
  incidents?: Array<{
    id: string;
    loggedDate: string;
    subject: string;
    priority: string;
    resolutionTime: string;
    status: string;
    assignee: string;
  }>;
  deliverablesProgress?: {
    completedCount: string;
    statusText: string;
    percentage: number;
  };
  milestones?: Array<{
    id: string;
    title: string;
    status: string;
    dateBadge: string;
    description: string;
    attachmentName?: string;
  }>;
  advisoryBurnDown?: {
    cycleName: string;
    usedHours: string;
    totalHours: string;
    percentage: number;
    remainingText: string;
    breakdown: Array<{ label: string; hours: string; colorClass?: string }>;
    policyNote: string;
  };
  executionStatus?: {
    statusTitle?: string;
    badgeText?: string;
    checksum?: string;
  };
  documents?: Array<{
    id: string;
    title: string;
    meta: string;
    fileSize: string;
  }>;
  auditTrail?: {
    overallStatus?: string;
    signers?: Array<{
      name: string;
      roleTitle: string;
      statusBadge: string;
      ipAddress: string;
      location: string;
      timestamp: string;
      verificationMethod: string;
    }>;
  };
  auditHistory?: Array<{
    id: string;
    category: "Contract Changes" | "Billing" | "Signatures" | "SLA";
    title: string;
    description: string;
    timestamp: string;
    systemId: string;
    dotColorClass?: string;
  }>;
}

interface AgreementTabContentProps {
  activeTab: string;
  data: AgreementData;
}

export function AgreementTabContent({
  activeTab,
  data,
}: AgreementTabContentProps) {
  const normalizedTab = activeTab.replace(/\s*\(.*\)/, "").trim();

  switch (normalizedTab) {
    case "Overview & Scope":
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AuthorizedServices />
            <ExclusionsRateSchedule />
          </div>
          <div className="space-y-6">
            <ContractTerms />
            <DesignatedStakeholders />
            <RecentAutomatedBilling />
          </div>
        </div>
      );

    case "Billing & Invoices":
      return (
        <div className="space-y-6">
          <BillingMetricsGrid metrics={data.billingMetrics} />
          <InvoicesTable invoices={data.invoices} />
          <BankRemittanceDetails bankDetails={data.bankDetails} />
        </div>
      );

    case "SLA Performance & Incidents":
      return (
        <div className="space-y-6">
          <SLAMetricsGrid metrics={data.slaMetrics} />
          <SLATierMatrix />
          <IncidentLogTable incidents={data.incidents} />
        </div>
      );

    case "Deliverables & Milestones":
      return (
        <div className="space-y-6">
          <DeliverablesProgressCard progress={data.deliverablesProgress} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <KeyMilestonesList milestones={data.milestones} />
            </div>
            <div>
              <AdvisoryBurnDownCard burnDown={data.advisoryBurnDown} />
            </div>
          </div>
        </div>
      );

    case "Contract Documents & E-Sign":
      return (
        <div className="space-y-6">
          <ExecutionStatusBanner statusData={data.executionStatus} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DocumentRepositoryList documents={data.documents} />
            </div>
            <div>
              <ESignatureAuditTrail auditData={data.auditTrail} />
            </div>
          </div>
        </div>
      );

    case "Audit Trail":
      return (
        <div className="space-y-6">
          <AuditHistoryView auditLogs={data.auditHistory} />
        </div>
      );

    default:
      return (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
          Content for{" "}
          <span className="font-semibold text-foreground">{activeTab}</span>{" "}
          goes here.
        </div>
      );
  }
}
