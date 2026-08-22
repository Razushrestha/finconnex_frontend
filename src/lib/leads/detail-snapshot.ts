import type { LeadCardData } from "@/lib/leads/types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";

export const LEAD_DETAIL_STAGES = MORTGAGE_PIPELINE_STAGES.filter(
  (stage) => stage !== "Lost",
);

function parseMoney(value?: string): number {
  if (!value) return 0;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatAud(n: number) {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function parseDisplayDate(value?: string): Date | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

export function daysInStage(card: LeadCardData, now = new Date()) {
  const entered = parseDisplayDate(card.stageEnteredAt ?? card.createdDate);
  if (!entered) return 0;
  return Math.max(
    0,
    Math.floor((now.getTime() - entered.getTime()) / 86_400_000),
  );
}

export function leadLocation(card: LeadCardData) {
  return card.custom?.preferredBranch || "Sydney, NSW";
}

export function leadBuyerTag(card: LeadCardData) {
  return (
    card.tags?.find((tag) => /home|buyer|refinance/i.test(tag)) ??
    card.tags?.[0] ??
    "Lead"
  );
}

export function leadApplicants(card: LeadCardData) {
  const primary = {
    name: card.name,
    role: "Primary" as const,
    residency: "Australian Citizen",
    employment: "PAYG",
  };
  if (/jamie cole/i.test(card.name)) {
    return [
      primary,
      {
        name: "Sarah Cole",
        role: "Secondary" as const,
        residency: "Australian Citizen",
        employment: "PAYG",
      },
    ];
  }
  return [primary];
}

export function leadFinancials(card: LeadCardData) {
  const value = parseMoney(card.estimatedValue);
  const property = value > 0 ? Math.round(value * 1.67) : 750_000;
  const loan = value > 0 ? value : 600_000;
  const deposit = Math.max(0, property - loan);
  return [
    { label: "Purpose", value: "Purchase" },
    { label: "Property Price", value: formatAud(property) },
    { label: "Loan Amount", value: formatAud(loan) },
    { label: "Deposit", value: formatAud(deposit) },
    { label: "Household Income", value: formatAud(205_000) },
    { label: "Timeframe", value: "1–3 Months" },
  ];
}

export function leadScoreBreakdown(card: LeadCardData) {
  const score = Number(card.custom?.leadScore ?? 82);
  return {
    score: Number.isFinite(score) ? score : 82,
    label: score >= 75 ? "High Potential" : score >= 50 ? "Warm" : "Cold",
    parts: [
      { label: "Contactability", value: 90, color: "#22c55e" },
      { label: "Intent", value: 80, color: "#3b82f6" },
      { label: "Financial Strength", value: 75, color: "#ef4444" },
      { label: "Timeframe Fit", value: 85, color: "#f59e0b" },
      { label: "Engagement", value: 88, color: "#7c3aed" },
    ],
  };
}

export function leadQualification(card: LeadCardData) {
  const firstHome = Boolean(
    card.tags?.some((tag) => /first home/i.test(tag)),
  );
  const money = leadFinancials(card);
  return {
    rows: [
      { label: "Citizenship", value: "Australian Citizen", ok: true },
      { label: "First Home Buyer", value: firstHome ? "Yes" : "No", ok: firstHome },
      { label: "Employment", value: "PAYG", ok: true },
      { label: "Credit Issues", value: "None declared", ok: true },
      { label: "Deposit", value: money[3]?.value ?? "—", ok: true },
      { label: "Income", value: money[4]?.value ?? "—", ok: true },
    ],
  };
}
