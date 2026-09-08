"use client";

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Gavel,
  ShieldAlert,
  CalendarClock,
  FolderOpen,
  CalendarCheck2,
  ShieldQuestion,
  History as HistoryIcon,
  FileCode,
  Users,
} from "lucide-react";

import ReportHeader from "@/components/finance/equifax/details/ReportHeader";
import ScoreGaugeCard from "@/components/finance/equifax/details/ScoreGaugeCard";
import MetricCard from "@/components/finance/equifax/details/MetricCard";
import ReportTabNav, {
  TabItem,
} from "@/components/finance/equifax/details/ReportTabNav";
import SectionCard from "@/components/finance/equifax/details/SectionCard";
import InfoGrid, {
  InfoItem,
} from "@/components/finance/equifax/details/InfoGrid";
import DirectorsTable, {
  Director,
} from "@/components/finance/equifax/details/DirectorsTable";
import FacilityRepaymentRow from "@/components/finance/equifax/details/FacilityRepaymentRow";
import {
  MONTHS_CLEAN,
  RepaymentLegend,
} from "@/components/finance/equifax/details/MonthDotTimeline";
import PpsrChargeRow from "@/components/finance/equifax/details/PpsrChargeRow";
import EnquiriesTable, {
  EnquiryItem,
} from "@/components/finance/equifax/details/EnquiriesTable";
import VerificationFooter from "@/components/finance/equifax/details/VerificationFooter";

// Mock Fallback Data for Commercial
const COMMERCIAL_DIRECTORS: Director[] = [
  {
    name: "Marcus Vance",
    role: "Managing Director (100% Shareholder)",
    dvsStatus: "Verified (Level 3)",
    personalScore: 840,
    personalScoreLabel: "Prime / Low Risk",
    crossGuarantorRisk: "None Detected",
  },
  {
    name: "Elena Rostova",
    role: "Company Secretary / Operations Director",
    dvsStatus: "Verified (Level 2)",
    personalScore: 795,
    personalScoreLabel: "Low Risk",
    crossGuarantorRisk: "None Detected",
  },
];

const COMMERCIAL_FACILITIES = [
  {
    provider: "National Australia Bank (NAB)",
    facilityType: "Commercial Business Loan — $450,000 Limit",
    termsLine: "Opened 14/08/2022 · Monthly Repayment Schedule · Secured",
    statusText: "Current — 0 Days Past Due",
    months: MONTHS_CLEAN,
  },
  {
    provider: "Westpac Banking Corporation",
    facilityType: "Multi-Option Business Overdraft — $100,000 Limit",
    termsLine: "Opened 02/11/2023 · Revolving Line · Unsecured",
    statusText: "Current — 0 Days Past Due",
    months: MONTHS_CLEAN,
  },
];

const COMMERCIAL_PPSR = [
  {
    securedParty: "Toyota Finance Australia Limited",
    registrationNo: "PPSR-2024-99102-18",
    collateral: "All Present & After-Acquired Property (Specific Motor Fleet)",
    registeredDate: "12 Mar 2024",
    expiryDate: "12 Mar 2031",
    chargeClass: "Purchase Money Security Interest (PMSI)",
    chargeClassVariant: "secondary" as const,
  },
];

// Consumer Fallback Data
const CONSUMER_FACILITIES = [
  {
    provider: "Commonwealth Bank of Australia",
    facilityType: "Residential Mortgage Facility — $450,000 Limit",
    termsLine: "Opened 10/05/2021 · Principal & Interest · Secured",
    statusText: "Current — 0 Days Past Due",
    months: MONTHS_CLEAN,
  },
  {
    provider: "ANZ Credit Cards",
    facilityType: "Consumer Revolving Credit Card — $15,000 Limit",
    termsLine: "Opened 22/01/2023 · Monthly Statement",
    statusText: "Current — 0 Days Past Due",
    months: MONTHS_CLEAN,
  },
];

const ENQUIRIES: EnquiryItem[] = [
  {
    date: "14 Oct 2026",
    provider: "FinConnex Capital",
    purpose: "Credit Enquiry",
    amount: "$50,000",
  },
  {
    date: "22 Jan 2026",
    provider: "Major Retail Bank",
    purpose: "Facility Review",
    amount: "$150,000",
  },
];

const TABS: TabItem[] = [
  { key: "overview", label: "Executive Summary" },
  { key: "ccr", label: "24-Month CCR History", count: 2 },
  { key: "directors", label: "Parties & Details", count: 2 },
  { key: "ppsr", label: "Securities & Enquiries", count: 2 },
  { key: "enquiries", label: "Enquiry History", count: 2 },
  { key: "documents", label: "Audit Trail & Notes" },
];

export default function CreditReportDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const reportId = params?.id ? String(params.id) : "EFX-8821";
  const [activeTab, setActiveTab] = useState("overview");

  // Extract dynamic parameters passed from EquifaxCreditPage router query
  const applicant = searchParams.get("applicant") || "Greystone Realty Pty Ltd";
  const subLabel = searchParams.get("subLabel") || "ACN: 49 104 293 841";
  const scoreParam = searchParams.get("score");
  const score = scoreParam ? Number(scoreParam) : 785;
  const band = searchParams.get("band") || "Excellent";
  const inquiryType =
    searchParams.get("inquiryType") || "Commercial Entity File";
  const reportDate =
    searchParams.get("reportDate") || "14 Oct 2026, 09:42 AM AEST";
  const status = searchParams.get("status") || "Verified";

  const isConsumer =
    inquiryType.toLowerCase().includes("consumer") ||
    inquiryType.toLowerCase().includes("personal");

  const infoItems: InfoItem[] = isConsumer
    ? [
        { label: "Consumer Full Name", value: applicant },
        { label: "Date of Birth / Details", value: subLabel },
        {
          label: "Identity Match Status",
          value: "Equifax DVS Level 3 Verified",
        },
        {
          label: "Residency Status",
          value: "Australian Resident (Home Owner)",
        },
        { label: "Employment Status", value: "Full-time Permanent" },
        {
          label: "Verification Source",
          value: "Equifax Consumer Credit Bureau",
        },
      ]
    : [
        { label: "Legal Entity Name", value: applicant },
        { label: "ACN / ABN", value: subLabel },
        {
          label: "Registered Address",
          value: "Suite 402, 100 Collins St, Melbourne VIC 3000",
        },
        { label: "Incorporation Date", value: "14 August 2022 (Active)" },
        {
          label: "Primary Industry Code",
          value: "ANZIC 6720 — Real Estate Services",
        },
        {
          label: "Operating Status",
          value: `${status} (ASIC / Equifax Verified)`,
        },
      ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <ReportHeader
        onBack={() => router.back()}
        entityName={applicant}
        fileType={inquiryType}
        metaLine={`${subLabel}  ·  Type: ${inquiryType}`}
        pulledLine={`Pulled: ${reportDate} (Status: ${status})`}
      />

      {/* Top Metric Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ScoreGaugeCard
          score={score}
          maxScore={1000}
          band={band}
          bandVariant="outline"
          footerLeft="Equifax Risk Index Scoring"
          footerRight={`${band} Risk Tier`}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetricCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="12-MO FAILURE RISK"
            value={score < 600 ? "4.15%" : "0.42%"}
            valueColor={score < 600 ? "text-rose-600" : "text-emerald-600"}
            badgeText={
              score < 600
                ? "Moderate Default Probability"
                : "Sub-1% Insolvency Probability"
            }
            badgeVariant="outline"
            footnote="Benchmarked against national credit averages"
          />
          <MetricCard
            icon={<Gavel className="h-4 w-4" />}
            label="COURT WRITS / DEFAULTS"
            value="0 Recorded"
            badgeText="Clean Public Register"
            badgeVariant="outline"
            footnote="Zero civil judgments or defaults filed"
          />
          <MetricCard
            icon={<ShieldAlert className="h-4 w-4" />}
            label="ACTIVE SECURED FACILITIES"
            value={isConsumer ? "2 Open Accounts" : "2 Active Registrations"}
            badgeText="Asset-backed Security"
            badgeVariant="secondary"
            footnote="Verified via credit bureau network"
          />

          <MetricCard
            icon={<CalendarClock className="h-4 w-4" />}
            label="24-MO REPAYMENT TRACK"
            value="100% On-Time"
            valueColor="text-emerald-600"
            badgeText="Perfect RHI Score (Code 0)"
            badgeVariant="outline"
            footnote="Zero 30+ day delinquencies recorded"
          />
        </div>
      </div>

      <ReportTabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Dynamic Tab Content */}
      <div className="flex flex-col gap-6">
        {activeTab === "overview" && (
          <SectionCard
            icon={<FolderOpen className="h-4 w-4" />}
            title={
              isConsumer
                ? "Consumer Profile & Identity Details"
                : "Entity Structure & Executive Summary"
            }
            rightLabel="Equifax Direct API Source"
          >
            <InfoGrid items={infoItems} />
          </SectionCard>
        )}

        {activeTab === "ccr" && (
          <SectionCard
            icon={<CalendarCheck2 className="h-4 w-4" />}
            title="Comprehensive Credit Reporting (CCR) — 24-Month Repayment History"
          >
            <p className="mb-3 text-xs text-slate-500">
              Mandatory reporting submitted by registered Australian credit
              providers under current financial regulations.
            </p>
            <div className="flex flex-col gap-4">
              {(isConsumer ? CONSUMER_FACILITIES : COMMERCIAL_FACILITIES).map(
                (f) => (
                  <FacilityRepaymentRow key={f.provider} {...f} />
                ),
              )}
            </div>
            <div className="mt-4">
              <RepaymentLegend />
            </div>
          </SectionCard>
        )}

        {activeTab === "directors" && (
          <SectionCard
            icon={<Users className="h-4 w-4" />}
            title={
              isConsumer
                ? "Consumer Identity & Personal Details"
                : "Linked Directors & Beneficial Owners"
            }
            rightLabel={
              isConsumer ? "DVS Verified Record" : "Cross-Bureau Match"
            }
          >
            <p className="mb-4 text-xs text-slate-500">
              {isConsumer
                ? "Verified individual identity records, historical residential addresses, and electoral roll checks."
                : "Verified individual director profiles, directorship histories, and personal cross-guarantor risk indicators."}
            </p>

            {isConsumer ? (
              <InfoGrid
                items={[
                  { label: "Full Legal Name", value: applicant },
                  { label: "Known Aliases", value: "None Recorded" },
                  {
                    label: "Current Residential Address",
                    value: "42 Wallaby Way, Sydney NSW 2000",
                  },
                  {
                    label: "Previous Address History",
                    value: "15/88 Elizabeth St, Sydney NSW 2000 (Last 3 Years)",
                  },
                  {
                    label: "Electoral Roll Status",
                    value: "Matched & Verified",
                  },
                ]}
              />
            ) : (
              <DirectorsTable
                directors={COMMERCIAL_DIRECTORS}
                onViewIndividualFile={(d) =>
                  console.log("View individual file", d.name)
                }
              />
            )}
          </SectionCard>
        )}

        {activeTab === "ppsr" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard
              icon={<ShieldQuestion className="h-4 w-4" />}
              title={
                isConsumer ? "Active Secured Loans" : "PPSR Registered Charges"
              }
              rightLabel={
                isConsumer ? "1 Secured Mortgage" : "2 Active Registrations"
              }
            >
              <div className="flex flex-col gap-3">
                {COMMERCIAL_PPSR.map((c) => (
                  <PpsrChargeRow key={c.registrationNo} {...c} />
                ))}
              </div>
            </SectionCard>

            <SectionCard
              icon={<HistoryIcon className="h-4 w-4" />}
              title="Recent Credit Enquiries"
              rightLabel="Enquiries logged"
            >
              <EnquiriesTable enquiries={ENQUIRIES} />
              <p className="mt-3 text-[11px] text-slate-400">
                Enquiry velocity is within normal risk tolerance thresholds.
              </p>
            </SectionCard>
          </div>
        )}

        {activeTab === "enquiries" && (
          <SectionCard
            icon={<HistoryIcon className="h-4 w-4" />}
            title="Full Commercial Enquiry History"
            rightLabel="Audit Trail Logged"
          >
            <EnquiriesTable enquiries={ENQUIRIES} />
            <p className="mt-3 text-xs text-slate-500">
              Complete logs of all credit applications and institutional
              searches registered against this file over the past 24 months.
            </p>
          </SectionCard>
        )}

        {activeTab === "documents" && (
          <div className="flex flex-col gap-6">
            <SectionCard
              icon={<FileCode className="h-4 w-4" />}
              title="System Audit Trail & Compliance Metadata"
              rightLabel={`Report Reference: ${reportId}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Access & Security Metadata
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex justify-between">
                      <span className="text-slate-400">Initiated By:</span>
                      <span className="font-medium text-slate-700">
                        System API / Underwriter
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-400">Gateway Protocol:</span>
                      <span className="font-medium text-slate-700">
                        Equifax Secure TLS 1.3
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-400">Consent Timestamp:</span>
                      <span className="font-medium text-slate-700">
                        {reportDate}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-400">
                        Data Retention Expiry:
                      </span>
                      <span className="font-medium text-slate-700">
                        14 Oct 2033 (7 Years)
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Official Bureau Artifacts
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Download the cryptographically signed PDF certificate for
                      archival in loan folders or regulatory audits.
                    </p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Download Certified PDF Report
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={<FolderOpen className="h-4 w-4" />}
              title="Internal CRM Underwriting Notes"
              rightLabel="Private Staff View"
            >
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="font-medium text-slate-600">
                      Senior Risk Officer
                    </span>
                    <span>14 Oct 2026, 10:15 AM</span>
                  </div>
                  <p className="text-slate-700">
                    File reviewed. Score tiering falls well within acceptable
                    parameters for the requested credit limit. No adverse court
                    actions or defaults discovered.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="font-medium text-slate-600">
                      Automated Risk Engine
                    </span>
                    <span>14 Oct 2026, 09:42 AM</span>
                  </div>
                  <p className="text-slate-700">
                    Pre-qualification check passed automatically. Zero manual
                    intervention required for initial screening phase.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        <VerificationFooter
          title="Privacy Act 1988 (Cth) & Equifax Subscriber Agreement Verified"
          detailLine={`Informed electronic consent authorised for ${applicant} on ${reportDate}.`}
          auditRef={`AUDIT-HASH: ${reportId}-VERIFIED`}
          onViewCertificate={() => console.log("View certificate")}
        />
      </div>
    </div>
  );
}
