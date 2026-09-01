import type { LeadCardData } from "@/lib/leads/types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";

export const LEAD_DETAIL_STAGES = [...MORTGAGE_PIPELINE_STAGES];

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
  const parts = [card.city, card.state, card.country].filter(
    (part) => part?.trim(),
  );
  if (parts.length) return parts.join(", ");
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
  const first = card.custom?.firstName?.trim();
  const middle = card.custom?.middleName?.trim();
  const last = card.custom?.surname?.trim() || card.custom?.lastName?.trim();
  const primaryName = [first, middle, last].filter(Boolean).join(" ") || card.name;
  const primary = {
    name: primaryName,
    role: "Primary" as const,
    residency:
      card.custom?.residency ||
      card.custom?.residencyStatus ||
      "Australian Citizen",
    employment: card.custom?.employmentType || card.custom?.employment || "PAYG",
  };
  if (card.custom?.secondaryApplicant !== "Yes") return [primary];
  const secondaryName =
    [
      card.custom?.["secondary.firstName"],
      card.custom?.["secondary.middleName"],
      card.custom?.["secondary.surname"] || card.custom?.["secondary.lastName"],
    ]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") || "Secondary applicant";
  return [
    primary,
    {
      name: secondaryName,
      role: "Secondary" as const,
      residency:
        card.custom?.["secondary.residency"] ||
        card.custom?.["secondary.residencyStatus"] ||
        "Australian Citizen",
      employment: card.custom?.["secondary.employmentType"] || "PAYG",
    },
  ];
}

export const LEAD_FIELD_KEYS = {
  purpose: "purpose",
  propertyPrice: "propertyPrice",
  loanAmount: "loanAmount",
  deposit: "deposit",
  householdIncome: "householdIncome",
  timeframe: "timeframe",
  citizenship: "citizenship",
  firstHomeBuyer: "firstHomeBuyer",
  secondaryApplicant: "secondaryApplicant",
  salutation: "salutation",
  preferredName: "preferredName",
  firstName: "firstName",
  middleName: "middleName",
  surname: "surname",
  gender: "gender",
  relationshipStatus: "relationshipStatus",
  dependants: "dependants",
  dependantAge1: "dependantAge1",
  dependantAge2: "dependantAge2",
  dependantAge3: "dependantAge3",
  dependantAge4: "dependantAge4",
  dependantAge5: "dependantAge5",
  currentAddress: "currentAddress",
  livingArrangement: "livingArrangement",
  moveInDate: "moveInDate",
  previousAddress: "previousAddress",
  previousMoveInDate: "previousMoveInDate",
  previousMoveOutDate: "previousMoveOutDate",
  previousAddress2: "previousAddress2",
  previous2MoveInDate: "previous2MoveInDate",
  previous2MoveOutDate: "previous2MoveOutDate",
  previousAddressCount: "previousAddressCount",
  previousAddressDismissed: "previousAddressDismissed",
  postalSameAsResidential: "postalSameAsResidential",
  postalAddress: "postalAddress",
  dateOfBirth: "dateOfBirth",
  residencyStatus: "residencyStatus",
  visaType: "visaType",
  licenceState: "licenceState",
  licenceCardNumber: "licenceCardNumber",
  licenceNumber: "licenceNumber",
  licenceExpiry: "licenceExpiry",
  employmentType: "employmentType",
  workArrangement: "workArrangement",
  employerName: "employerName",
  employerContactName: "employerContactName",
  employerAddress: "employerAddress",
  occupation: "occupation",
  employmentStartDate: "employmentStartDate",
  employmentCount: "employmentCount",
  employment: "employment",
  creditIssues: "creditIssues",
  creditScore: "creditScore",
  creditScoreChecked: "creditScoreChecked",
  creditEnquiries: "creditEnquiries",
  creditDefaults: "creditDefaults",
  occupancy: "occupancy",
  structure: "structure",
  rateType: "rateType",
  targetLvr: "targetLvr",
  lmi: "lmi",
} as const;

export function leadFinancials(card: LeadCardData) {
  const value = parseMoney(card.custom?.loanAmount || card.estimatedValue);
  const propertyDefault = value > 0 ? Math.round(value * 1.67) : 750_000;
  const loanDefault = value > 0 ? value : 600_000;
  const property = card.custom?.propertyPrice || formatAud(propertyDefault);
  const loan = card.custom?.loanAmount || formatAud(loanDefault);
  const deposit =
    card.custom?.deposit ||
    formatAud(Math.max(0, parseMoney(property) - parseMoney(loan)));
  return [
    { key: LEAD_FIELD_KEYS.purpose, label: "Purpose", value: card.custom?.purpose || "Purchase" },
    { key: LEAD_FIELD_KEYS.propertyPrice, label: "Property Price", value: property },
    { key: LEAD_FIELD_KEYS.loanAmount, label: "Loan Amount", value: loan },
    { key: LEAD_FIELD_KEYS.deposit, label: "Deposit", value: deposit },
    {
      key: LEAD_FIELD_KEYS.householdIncome,
      label: "Household Income",
      value: card.custom?.householdIncome || formatAud(205_000),
    },
    { key: LEAD_FIELD_KEYS.timeframe, label: "Timeframe", value: card.custom?.timeframe || "1–3 Months" },
  ];
}

export function leadScoreBreakdown(card: LeadCardData) {
  const score = Number(card.score ?? card.custom?.leadScore ?? 82);
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

export function leadLoanStrategy(card: LeadCardData) {
  const firstHome = Boolean(card.tags?.some((tag) => /first home/i.test(tag)));
  const refinance = Boolean(card.tags?.some((tag) => /refinance/i.test(tag)));
  const money = leadFinancials(card);
  const loanLabel = money.find((row) => row.label === "Loan Amount")?.value ?? "—";
  const deposit = money.find((row) => row.label === "Deposit")?.value ?? "—";

  if (refinance) {
    return {
      headline: "Cash-flow refinance · Owner Occupier",
      summary:
        "Reprice the current loan and add an offset to cut interest without changing the repayment term.",
    facts: [
      { key: LEAD_FIELD_KEYS.purpose, label: "Purpose", value: card.custom?.purpose || "Refinance" },
      { key: LEAD_FIELD_KEYS.structure, label: "Structure", value: card.custom?.structure || "P&I" },
      { key: LEAD_FIELD_KEYS.occupancy, label: "Occupancy", value: card.custom?.occupancy || "Owner Occupier" },
      { key: LEAD_FIELD_KEYS.rateType, label: "Rate type", value: card.custom?.rateType || "Variable" },
      { key: LEAD_FIELD_KEYS.targetLvr, label: "Target LVR", value: card.custom?.targetLvr || "72%" },
      { key: LEAD_FIELD_KEYS.lmi, label: "LMI", value: card.custom?.lmi || "Not required" },
    ],
      lenders: ["CBA", "Macquarie", "ING"],
      features: ["Offset account", "Extra repayments", "Redraw"],
      options: [
        {
          name: "Stay & reprice",
          rate: "5.89%",
          repayment: "$3,210 / mo",
          note: "Lowest switch cost",
          recommended: false,
        },
        {
          name: "Refinance + offset",
          rate: "5.74%",
          repayment: "$3,150 / mo",
          note: "Recommended",
          recommended: true,
        },
        {
          name: "Split 50 / 50",
          rate: "5.92%",
          repayment: "$3,240 / mo",
          note: "Rate certainty",
          recommended: false,
        },
      ],
      note: `Current loan ${loanLabel}. Discharge and break costs should be confirmed before switching.`,
    };
  }

  return {
    headline: firstHome
      ? "First home purchase · Owner Occupier"
      : "Purchase · Owner Occupier",
    summary: firstHome
      ? "Maximise borrowing with a variable P&I loan and keep LVR under the LMI threshold where possible."
      : "Structure a variable P&I home loan with offset so surplus cash reduces interest from day one.",
    facts: [
      { key: LEAD_FIELD_KEYS.purpose, label: "Purpose", value: card.custom?.purpose || "Purchase" },
      { key: LEAD_FIELD_KEYS.structure, label: "Structure", value: card.custom?.structure || "P&I" },
      { key: LEAD_FIELD_KEYS.occupancy, label: "Occupancy", value: card.custom?.occupancy || "Owner Occupier" },
      { key: LEAD_FIELD_KEYS.rateType, label: "Rate type", value: card.custom?.rateType || "Variable" },
      {
        key: LEAD_FIELD_KEYS.targetLvr,
        label: "Target LVR",
        value: card.custom?.targetLvr || (firstHome ? "80%" : "78%"),
      },
      {
        key: LEAD_FIELD_KEYS.lmi,
        label: "LMI",
        value: card.custom?.lmi || (firstHome ? "Avoid if possible" : "Not required"),
      },
    ],
    lenders: firstHome
      ? ["CBA", "NAB", "Bank of Queensland"]
      : ["ANZ", "CBA", "Athena"],
    features: firstHome
      ? ["FHB grant check", "Offset account", "Extra repayments"]
      : ["Offset account", "Extra repayments", "Redraw"],
    options: [
      {
        name: "Variable + offset",
        rate: "5.69%",
        repayment: "$3,420 / mo",
        note: "Recommended",
        recommended: true,
      },
      {
        name: "2-year fixed",
        rate: "5.54%",
        repayment: "$3,360 / mo",
        note: "Repayment certainty",
        recommended: false,
      },
      {
        name: "70 / 30 split",
        rate: "5.72%",
        repayment: "$3,440 / mo",
        note: "Balance of flexibility",
        recommended: false,
      },
    ],
    note: firstHome
      ? `Deposit ${deposit}. Confirm First Home Buyer grant and stamp duty concessions for the purchase state.`
      : `Loan amount ${loanLabel}. Keep genuine savings evidence ready for lender servicing.`,
  };
}

export function leadQualification(card: LeadCardData) {
  const firstHome = Boolean(
    card.tags?.some((tag) => /first home/i.test(tag)),
  );
  const money = leadFinancials(card);
  return {
    rows: [
      {
        key: LEAD_FIELD_KEYS.citizenship,
        label: "Citizenship",
        value: card.custom?.citizenship || "Australian Citizen",
        ok: true,
      },
      {
        key: LEAD_FIELD_KEYS.firstHomeBuyer,
        label: "First Home Buyer",
        value: card.custom?.firstHomeBuyer || (firstHome ? "Yes" : "No"),
        ok: (card.custom?.firstHomeBuyer || (firstHome ? "Yes" : "No")) === "Yes",
      },
      {
        key: LEAD_FIELD_KEYS.employment,
        label: "Employment",
        value: card.custom?.employment || "PAYG",
        ok: true,
      },
      {
        key: LEAD_FIELD_KEYS.creditIssues,
        label: "Credit Issues",
        value: card.custom?.creditIssues || "None declared",
        ok: true,
      },
      { key: LEAD_FIELD_KEYS.deposit, label: "Deposit", value: money[3]?.value ?? "—", ok: true },
      {
        key: LEAD_FIELD_KEYS.householdIncome,
        label: "Income",
        value: money[4]?.value ?? "—",
        ok: true,
      },
    ],
  };
}
