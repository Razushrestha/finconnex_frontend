import type { LeadCardData } from "@/lib/leads/types";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
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

function displayMoney(raw?: string): string {
  const text = raw?.trim() ?? "";
  if (!text) return "";
  const n = parseMoney(text);
  if (n > 0 && !/\$/.test(text)) return formatAud(n);
  return text;
}

export function daysInStage(card: LeadCardData, now = new Date()) {
  const entered =
    parseFlexibleDate(card.stageEnteredAt) ??
    parseFlexibleDate(card.createdDate);
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
  return card.custom?.preferredBranch?.trim() || "";
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
      card.custom?.residency?.trim() ||
      card.custom?.residencyStatus?.trim() ||
      "",
    employment:
      card.custom?.employmentType?.trim() ||
      card.custom?.employment?.trim() ||
      "",
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
        card.custom?.["secondary.residency"]?.trim() ||
        card.custom?.["secondary.residencyStatus"]?.trim() ||
        "",
      employment: card.custom?.["secondary.employmentType"]?.trim() || "",
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
  const property = displayMoney(card.custom?.propertyPrice);
  const loan = displayMoney(card.custom?.loanAmount || card.estimatedValue);
  const deposit =
    displayMoney(card.custom?.deposit) ||
    (property && loan
      ? formatAud(Math.max(0, parseMoney(property) - parseMoney(loan)))
      : "");
  return [
    {
      key: LEAD_FIELD_KEYS.purpose,
      label: "Purpose",
      value: card.custom?.purpose?.trim() || "",
    },
    { key: LEAD_FIELD_KEYS.propertyPrice, label: "Property Price", value: property },
    { key: LEAD_FIELD_KEYS.loanAmount, label: "Loan Amount", value: loan },
    { key: LEAD_FIELD_KEYS.deposit, label: "Deposit", value: deposit },
    {
      key: LEAD_FIELD_KEYS.householdIncome,
      label: "Household Income",
      value: displayMoney(card.custom?.householdIncome),
    },
    {
      key: LEAD_FIELD_KEYS.timeframe,
      label: "Timeframe",
      value: card.custom?.timeframe?.trim() || "",
    },
  ];
}

export function leadScoreBreakdown(card: LeadCardData) {
  const fromCustom = card.custom?.leadScore?.trim();
  const raw =
    typeof card.score === "number" ? card.score : fromCustom ? Number(fromCustom) : NaN;
  const score = Number.isFinite(raw) ? raw : null;
  return {
    score,
    label:
      score == null
        ? ""
        : score >= 75
          ? "High Potential"
          : score >= 50
            ? "Warm"
            : "Cold",
    parts: [] as { label: string; value: number; color: string }[],
  };
}

export function leadLoanStrategy(card: LeadCardData) {
  const purpose = card.custom?.purpose?.trim() || "";
  const money = leadFinancials(card);
  const loanLabel = money.find((row) => row.label === "Loan Amount")?.value ?? "";
  const deposit = money.find((row) => row.label === "Deposit")?.value ?? "";
  const facts = [
    { key: LEAD_FIELD_KEYS.purpose, label: "Purpose", value: purpose },
    {
      key: LEAD_FIELD_KEYS.structure,
      label: "Structure",
      value: card.custom?.structure?.trim() || "",
    },
    {
      key: LEAD_FIELD_KEYS.occupancy,
      label: "Occupancy",
      value: card.custom?.occupancy?.trim() || "",
    },
    {
      key: LEAD_FIELD_KEYS.rateType,
      label: "Rate type",
      value: card.custom?.rateType?.trim() || "",
    },
    {
      key: LEAD_FIELD_KEYS.targetLvr,
      label: "Target LVR",
      value: card.custom?.targetLvr?.trim() || "",
    },
    {
      key: LEAD_FIELD_KEYS.lmi,
      label: "LMI",
      value: card.custom?.lmi?.trim() || "",
    },
  ];
  return {
    headline: purpose || "Loan strategy",
    summary: "",
    facts,
    lenders: [] as string[],
    features: [] as string[],
    options: [] as {
      name: string;
      rate: string;
      repayment: string;
      note: string;
      recommended: boolean;
    }[],
    note: [loanLabel && `Loan ${loanLabel}`, deposit && `Deposit ${deposit}`]
      .filter(Boolean)
      .join(". "),
  };
}

export function leadQualification(card: LeadCardData) {
  const firstHomeTag = Boolean(
    card.tags?.some((tag) => /first home/i.test(tag)),
  );
  const firstHome =
    card.custom?.firstHomeBuyer?.trim() || (firstHomeTag ? "Yes" : "");
  const money = leadFinancials(card);
  const rows = [
    {
      key: LEAD_FIELD_KEYS.citizenship,
      label: "Citizenship",
      value: card.custom?.citizenship?.trim() || "",
    },
    {
      key: LEAD_FIELD_KEYS.firstHomeBuyer,
      label: "First Home Buyer",
      value: firstHome,
    },
    {
      key: LEAD_FIELD_KEYS.employment,
      label: "Employment",
      value: card.custom?.employment?.trim() || "",
    },
    {
      key: LEAD_FIELD_KEYS.creditIssues,
      label: "Credit Issues",
      value: card.custom?.creditIssues?.trim() || "",
    },
    {
      key: LEAD_FIELD_KEYS.deposit,
      label: "Deposit",
      value: money[3]?.value ?? "",
    },
    {
      key: LEAD_FIELD_KEYS.householdIncome,
      label: "Income",
      value: money[4]?.value ?? "",
    },
  ];
  return {
    rows: rows.map((row) => ({
      ...row,
      ok: Boolean(row.value.trim()),
    })),
  };
}
