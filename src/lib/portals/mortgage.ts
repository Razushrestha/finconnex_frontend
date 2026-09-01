/** Mortgage client-portal state (session-scoped demo). */

import type { LeadCardData } from "@/lib/leads/types";
import {
  leadCustomToFactFind,
  mergeFactFind,
} from "@/lib/leads/fact-find-bridge";
import type { ClientPortal } from "@/lib/portals/types";
import { ALL_LIVING_EXPENSE_ITEMS } from "@/lib/portals/living-expenses";

export const PORTAL_BRAND = "#5A32A3";
export const PORTAL_CANVAS = "#F7F6F9";

export type JourneyStageId =
  | "fact-find"
  | "documents"
  | "assessment"
  | "recommendation"
  | "application"
  | "approval"
  | "settlement";

export type JourneyStageStatus = "done" | "current" | "upcoming";

export type MortgageDocStatus = "pending" | "under-review" | "accepted" | "rejected";
export type DocumentListTab = "pending" | "submitted";

export function normalizeDocStatus(status: string): MortgageDocStatus {
  if (status === "accepted" || status === "received") return "accepted";
  if (status === "under-review") return "under-review";
  if (status === "rejected") return "rejected";
  return "pending";
}

export function documentListTab(status: string): DocumentListTab {
  const normalized = normalizeDocStatus(status);
  return normalized === "pending" || normalized === "rejected" ? "pending" : "submitted";
}

export function canReplaceDocument(status: string) {
  return normalizeDocStatus(status) !== "accepted";
}

export const JOURNEY_STAGES: {
  id: JourneyStageId;
  label: string;
}[] = [
  { id: "fact-find", label: "Fact Find" },
  { id: "documents", label: "Documents" },
  { id: "assessment", label: "Assessment" },
  { id: "recommendation", label: "Recommendation" },
  { id: "application", label: "Application" },
  { id: "approval", label: "Approval" },
  { id: "settlement", label: "Settlement" },
];

export const JOURNEY_COPY: Record<
  JourneyStageId,
  { title: string; body: string }
> = {
  "fact-find": {
    title: "Fact find",
    body: "Share your household, employment, income, and property details so we can assess your borrowing position.",
  },
  documents: {
    title: "Documents",
    body: "Upload ID, income, and savings evidence. We review each file as it arrives.",
  },
  assessment: {
    title: "Assessment",
    body: "Your broker is reviewing your position and matching lenders against your goals.",
  },
  recommendation: {
    title: "Recommendation",
    body: "We’ll present an indicative loan structure, lender, and estimated repayment for you to review.",
  },
  application: {
    title: "Application",
    body: "Once you approve the recommendation, we lodge the formal application with the lender.",
  },
  approval: {
    title: "Approval",
    body: "The lender issues unconditional approval. We’ll walk you through any remaining conditions.",
  },
  settlement: {
    title: "Settlement",
    body: "Funds are prepared and the loan settles. Welcome to your new home loan.",
  },
};

export interface MortgageBroker {
  name: string;
  title: string;
  phone: string;
  email: string;
  initials: string;
}

export interface MortgageClient {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  preferredContact: "Phone" | "Email" | "SMS";
}

export interface MortgageDocumentFile {
  id: string;
  name: string;
  sizeBytes?: number;
  uploadedAt: string;
}

export interface MortgageDocument {
  id: string;
  name: string;
  status: MortgageDocStatus;
  fileName?: string;
  uploadedAt?: string;
  reason?: string;
  description?: string;
  rejectionReason?: string;
  notApplicable?: boolean;
  notApplicableReason?: string;
  files?: MortgageDocumentFile[];
}

export function documentFiles(doc: MortgageDocument): MortgageDocumentFile[] {
  if (doc.files?.length) return doc.files;
  if (!doc.fileName) return [];
  return [
    {
      id: `${doc.id}-legacy`,
      name: doc.fileName,
      uploadedAt: doc.uploadedAt ?? "",
    },
  ];
}

export function formatFileSize(bytes?: number) {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb).toString()} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function isDocumentOutstanding(doc: MortgageDocument) {
  if (doc.notApplicable) return false;
  const status = normalizeDocStatus(doc.status);
  return status === "pending" || status === "rejected";
}

export const DOCUMENT_DESCRIPTIONS: Record<string, string> = {
  lic: "A clear colour copy of your current driver licence, front and back. We use this to verify your identity with the lender.",
  payslips: "Your last 3 months of payslips showing employer name, YTD income, and tax withheld. Needed to confirm PAYG income.",
  medicare: "A copy of your Medicare card. Used as a secondary identity check alongside your licence.",
  address: "A recent rates notice, utility bill, or bank letter dated within 90 days that shows your current residential address.",
  empl: "A letter from your employer confirming your role, start date, and employment type (permanent, contract, or casual).",
  tax: "Your latest tax return or notice of assessment so we can verify declared income and any additional earnings.",
  contract: "The signed contract of sale, including the purchase price, deposit, and settlement date.",
  bank: "Transaction statements for the last 3 months on your main everyday and savings accounts so we can review living expenses and savings history.",
  savings: "Evidence of genuine savings held in your name for at least 3 months, such as a savings account statement or term deposit.",
  "gift-letter": "If any of your deposit is a gift, a signed letter from the giftor confirming the amount and that it does not need to be repaid.",
};

export function documentDescription(doc: MortgageDocument) {
  return (
    doc.description ??
    doc.reason ??
    DOCUMENT_DESCRIPTIONS[doc.id] ??
    "Required for your loan assessment."
  );
}

export interface MortgageMessage {
  id: string;
  from: "broker" | "client";
  name: string;
  body: string;
  at: string;
  unread: boolean;
}

export interface MortgageNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href: string;
}

export interface MortgageTimelineEvent {
  id: string;
  title: string;
  at: string;
  done: boolean;
}

export type FactFindFieldType = "text" | "date" | "number" | "select";
export type FactFindControl = "choice" | "phone" | "money";

export interface FactFindField {
  id: string;
  section: "about" | "employment" | "income" | "property" | "liabilities";
  label: string;
  type: FactFindFieldType;
  options?: string[];
  control?: FactFindControl;
  hint?: string;
  optional?: boolean;
}

export interface ProposedLoan {
  lender: string;
  loanAmount: number;
  purchasePrice: number;
  deposit: number;
  loanType: string;
  rate: number;
  termYears: number;
}

export interface PortalConsent {
  acceptedAt: string;
  acceptedAtIso: string;
}

export interface MortgagePortalState {
  client: MortgageClient;
  broker: MortgageBroker;
  currentStage: JourneyStageId;
  documents: MortgageDocument[];
  messages: MortgageMessage[];
  notifications: MortgageNotification[];
  timeline: MortgageTimelineEvent[];
  factFind: Record<string, string>;
  loan: ProposedLoan;
  consent?: PortalConsent;
  loginCount?: number;
}

export const FACT_FIND_SECTIONS = [
  { id: "about", title: "About you" },
  { id: "employment", title: "Employment" },
  { id: "income", title: "Income" },
  { id: "property", title: "Property & loan" },
  { id: "liabilities", title: "Liabilities" },
] as const;

export const FACT_FIND_FIELDS: FactFindField[] = [
  {
    id: "preferredName",
    section: "about",
    label: "Preferred name",
    type: "text",
    optional: true,
  },
  {
    id: "title",
    section: "about",
    label: "Title",
    type: "select",
    control: "choice",
    options: ["Mr.", "Mrs", "Miss", "Other"],
  },
  { id: "firstName", section: "about", label: "First name", type: "text" },
  { id: "middleName", section: "about", label: "Middle name", type: "text", optional: true },
  { id: "lastName", section: "about", label: "Last name", type: "text" },
  {
    id: "gender",
    section: "about",
    label: "Gender",
    type: "select",
    control: "choice",
    options: ["Male", "Female", "Other"],
  },
  { id: "mobile", section: "about", label: "Phone number", type: "text", control: "phone" },
  {
    id: "marital",
    section: "about",
    label: "Relationship status",
    type: "select",
    options: ["Single", "De facto", "Married", "Separated", "Divorced"],
  },
  {
    id: "dependants",
    section: "about",
    label: "Dependants",
    type: "select",
    options: ["0", "1", "2", "3", "4", "5"],
    hint: "A dependant is a child under the age of 18 or anyone else who is financially dependant on you, regardless of their age.",
  },
  {
    id: "currentAddress",
    section: "about",
    label: "Current residential address",
    type: "text",
  },
  { id: "streetAddress", section: "about", label: "Street address", type: "text", optional: true },
  { id: "addressSuburb", section: "about", label: "Suburb", type: "text", optional: true },
  {
    id: "addressState",
    section: "about",
    label: "State",
    type: "select",
    optional: true,
    options: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"],
  },
  { id: "addressPostcode", section: "about", label: "Postcode", type: "text", optional: true },
  {
    id: "livingArrangement",
    section: "about",
    label: "Living arrangements",
    type: "select",
    options: [
      "I own my home with a mortgage",
      "I own my home outright",
      "I am renting",
      "I live with family or relatives",
      "Other",
    ],
  },
  { id: "moveInDate", section: "about", label: "Move in date", type: "date" },
  {
    id: "postalSame",
    section: "about",
    label: "Postal address is the same?",
    type: "select",
    control: "choice",
    options: ["Yes", "No"],
  },
  { id: "dob", section: "about", label: "Date of birth", type: "date" },
  {
    id: "residency",
    section: "about",
    label: "Residency status",
    type: "select",
    control: "choice",
    options: [
      "Australian citizen",
      "NZ Citizen",
      "Permanent resident",
      "Temporary resident",
    ],
  },
  {
    id: "visaType",
    section: "about",
    label: "Visa type",
    type: "text",
    optional: true,
  },
  {
    id: "hasDriverLicence",
    section: "about",
    label: "Australian Driver Licence",
    type: "select",
    options: ["Yes", "No"],
  },
  {
    id: "licenceState",
    section: "about",
    label: "State issued in",
    type: "select",
    optional: true,
    options: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"],
  },
  {
    id: "licenceNumber",
    section: "about",
    label: "Driver licence number",
    type: "text",
    optional: true,
  },
  {
    id: "licenceCardNumber",
    section: "about",
    label: "Card number",
    type: "text",
    optional: true,
  },
  {
    id: "licenceExpiry",
    section: "about",
    label: "Expiry date",
    type: "date",
    optional: true,
  },
  {
    id: "nameChanged",
    section: "about",
    label: "Legal name has ever changed?",
    type: "select",
    control: "choice",
    options: ["Yes", "No"],
  },
  {
    id: "previousLegalName",
    section: "about",
    label: "Previous legal name",
    type: "text",
    optional: true,
  },
  {
    id: "employmentType",
    section: "employment",
    label: "Employment type",
    type: "select",
    control: "choice",
    options: ["Employee", "Self employed", "Household duties", "Retired", "Unemployed", "Student"],
    optional: true,
  },
  { id: "employer", section: "employment", label: "Employer name", type: "text", optional: true },
  { id: "occupation", section: "employment", label: "Occupation", type: "text", optional: true },
  { id: "startDate", section: "employment", label: "Start date of employment", type: "date", optional: true },
  {
    id: "employmentsJson",
    section: "employment",
    label: "Employment history",
    type: "text",
    optional: true,
  },
  {
    id: "annualIncome",
    section: "income",
    label: "Annual base income",
    type: "number",
    control: "money",
    optional: true,
  },
  {
    id: "otherIncome",
    section: "income",
    label: "Other income (annual)",
    type: "number",
    control: "money",
    optional: true,
    hint: "Bonuses, overtime, rental income, or anything else you earn in a year.",
  },
  {
    id: "incomesJson",
    section: "income",
    label: "Income",
    type: "text",
  },
  {
    id: "purpose",
    section: "property",
    label: "How do you plan on using the property?",
    type: "select",
    control: "choice",
    options: ["To live-in", "As an investment"],
  },
  {
    id: "hasPropertyInMind",
    section: "property",
    label: "Do you have a property in mind?",
    type: "select",
    control: "choice",
    options: ["Yes", "No"],
  },
  {
    id: "propertySearchAddress",
    section: "property",
    label: "Property address",
    type: "text",
    optional: true,
  },
  {
    id: "propertySearchGeo",
    section: "property",
    label: "Verified property address",
    type: "text",
    optional: true,
  },
  {
    id: "propertyPostcodes",
    section: "property",
    label: "Postcodes",
    type: "text",
    optional: true,
  },
  {
    id: "purchasePrice",
    section: "property",
    label: "What is the property value you are looking to buy?",
    type: "number",
    control: "money",
  },
  { id: "suburb", section: "property", label: "Property suburb", type: "text", optional: true },
  {
    id: "deposit",
    section: "property",
    label: "Deposit or equity",
    type: "number",
    control: "money",
    optional: true,
  },
  {
    id: "desiredLoanAmount",
    section: "property",
    label: "Desired loan amount",
    type: "number",
    control: "money",
    optional: true,
  },
  {
    id: "loanAmountUnsure",
    section: "property",
    label: "Loan amount unsure",
    type: "text",
    optional: true,
  },
  {
    id: "rateType",
    section: "property",
    label: "What rate type are you interested in?",
    type: "select",
    control: "choice",
    options: ["Variable", "Fixed", "Both", "Unsure"],
    optional: true,
  },
  {
    id: "repaymentTypePref",
    section: "property",
    label: "Repayment type",
    type: "select",
    control: "choice",
    options: ["Principal & interest", "Interest only", "Unsure"],
    optional: true,
  },
  {
    id: "loanTerm",
    section: "property",
    label: "Loan term",
    type: "select",
    options: Array.from({ length: 30 }, (_, i) => (i === 0 ? "1 year" : `${i + 1} years`)),
    optional: true,
  },
  {
    id: "repaymentFrequency",
    section: "property",
    label: "Repayment frequency",
    type: "select",
    options: ["Weekly", "Fortnightly", "Monthly"],
    optional: true,
  },
  {
    id: "loanFeatures",
    section: "property",
    label: "Loan features",
    type: "text",
    optional: true,
  },
  {
    id: "otherLoanRequirements",
    section: "property",
    label: "Other loan requirements",
    type: "text",
    optional: true,
  },
  {
    id: "creditCards",
    section: "liabilities",
    label: "Credit card limits",
    type: "number",
    control: "money",
    optional: true,
  },
  {
    id: "otherLoans",
    section: "liabilities",
    label: "Other loan balances",
    type: "number",
    control: "money",
    optional: true,
  },
  {
    id: "hecs",
    section: "liabilities",
    label: "HELP / HECS balance",
    type: "number",
    control: "money",
    optional: true,
  },
  {
    id: "liabilitiesJson",
    section: "liabilities",
    label: "Liabilities",
    type: "text",
    optional: true,
  },
  {
    id: "gift",
    section: "liabilities",
    label: "Are any funds a gift?",
    type: "select",
    control: "choice",
    options: ["No", "Yes"],
    optional: true,
  },
  { id: "savingsTotal", section: "income", label: "Total savings", type: "number", control: "money" },
  { id: "sharesTotal", section: "income", label: "Total shares", type: "number", control: "money", optional: true },
  { id: "superTotal", section: "income", label: "Total superannuation", type: "number", control: "money", optional: true },
  { id: "superInstitution", section: "income", label: "Primary superannuation institution", type: "text", optional: true },
  { id: "assetPropertyValue", section: "income", label: "Property value", type: "number", control: "money", optional: true },
  { id: "propertiesJson", section: "income", label: "Properties", type: "text", optional: true },
  { id: "vehiclesJson", section: "income", label: "Vehicles", type: "text", optional: true },
  { id: "homeContents", section: "income", label: "Home contents", type: "number", control: "money", optional: true },
  { id: "otherAssets", section: "income", label: "Other assets", type: "number", control: "money", optional: true },
  ...ALL_LIVING_EXPENSE_ITEMS.map((item) => ({
    id: item.key,
    section: "liabilities" as const,
    label: item.label,
    type: "number" as const,
    control: "money" as const,
    optional: true,
  })),
];

export const FACT_FIND_WIZARD = [
  {
    id: "details",
    title: "Your details",
    estimate: "< 5min",
    screens: [
      {
        id: "personal",
        title: "Your details",
        blurb: "",
        fields: ["preferredName", "mobile", "title", "gender", "marital", "dependants"],
      },
      {
        id: "address",
        title: "Your 3 year residential history",
        blurb: "",
        fields: ["currentAddress", "livingArrangement", "moveInDate", "postalSame"],
      },
      {
        id: "id",
        title: "Your ID details",
        blurb: "",
        fields: ["firstName", "lastName", "dob", "residency", "hasDriverLicence", "nameChanged"],
      },
    ],
  },
  {
    id: "finances",
    title: "Your finances",
    estimate: "< 8min",
    screens: [
      {
        id: "assets",
        title: "Assets",
        blurb: "Add details of your assets.",
        fields: [
          "savingsTotal",
          "sharesTotal",
          "superTotal",
          "assetPropertyValue",
          "propertiesJson",
          "homeContents",
          "otherAssets",
        ],
      },
      {
        id: "income",
        title: "Income",
        blurb: "",
        fields: ["incomesJson"],
      },
      {
        id: "employment",
        title: "Your 3 year employment history",
        blurb: "",
        fields: ["employmentType", "employer", "occupation", "startDate", "employmentsJson"],
      },
      {
        id: "debts",
        title: "Liabilities",
        blurb:
          "Provide details of your liabilities such as mortgages, credit cards, loans, Buy Now Pay Later, student loans and tax amounts owing.",
        fields: ["liabilitiesJson"],
      },
      {
        id: "expenses",
        title: "Expenses",
        blurb: "Add your predicted expenses.",
        fields: ["exp.other"],
      },
    ],
  },
  {
    id: "property",
    title: "Property & Loan",
    estimate: "< 3min",
    screens: [
      {
        id: "property-details",
        title: "Property details",
        blurb: "",
        fields: [
          "purpose",
          "hasPropertyInMind",
          "propertySearchAddress",
          "propertyPostcodes",
          "purchasePrice",
        ],
      },
      {
        id: "loan-preferences",
        title: "Loan preferences",
        blurb:
          "Complete this to the best of your understanding. Your broker will discuss your preferences with you once they receive them.",
        fields: [
          "desiredLoanAmount",
          "rateType",
          "repaymentTypePref",
          "loanTerm",
          "repaymentFrequency",
          "loanFeatures",
          "otherLoanRequirements",
        ],
      },
    ],
  },
  {
    id: "loan",
    title: "Review and submit",
    estimate: "< 1min",
    screens: [
      {
        id: "review",
        title: "Review your details and submit",
        blurb: "Check the details below, then submit your fact find.",
        fields: [],
      },
    ],
  },
] as const;

export type FactFindScreenId =
  (typeof FACT_FIND_WIZARD)[number]["screens"][number]["id"];

export function factFindFieldById(id: string) {
  return FACT_FIND_FIELDS.find((f) => f.id === id);
}

export function factFindScreens() {
  return FACT_FIND_WIZARD.flatMap((group) =>
    group.screens.map((screen) => ({
      ...screen,
      groupId: group.id,
      groupTitle: group.title,
      estimate: group.estimate,
    })),
  );
}

export function parseMonthYear(value: string) {
  const slash = value.trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) return new Date(Number(slash[2]), Number(slash[1]) - 1, 1);
  const iso = value.trim().match(/^(\d{4})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, 1);
  const full = Date.parse(value);
  if (Number.isFinite(full)) {
    const d = new Date(full);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  return null;
}

export function monthsSince(value: string) {
  const d = parseMonthYear(value);
  if (!d) return null;
  const now = new Date();
  return Math.max(
    0,
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()),
  );
}

export function formatYearsAndMonths(totalMonths: number) {
  const months = Math.max(0, Math.floor(totalMonths));
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(years === 1 ? "1 year" : `${years} years`);
  if (rem > 0 || years === 0) parts.push(rem === 1 ? "1 month" : `${rem} months`);
  return parts.join(" ");
}

export function currentAddressGapMessage(moveInDate: string) {
  const current = monthsSince(moveInDate);
  if (current == null) return null;
  if (current >= 36) return null;
  const needed = 36 - current;
  return `Your current address is only ${formatYearsAndMonths(current)}. You need ${needed} more month${needed === 1 ? "" : "s"}.`;
}

export function hasThreeYearResidence(answers: Record<string, string>) {
  const current = monthsSince(answers.moveInDate ?? "");
  if (current != null && current >= 36) return true;
  const previousFrom = monthsSince(answers.previousMoveIn ?? "");
  return Boolean(answers.previousAddress?.trim() && previousFrom != null && previousFrom >= 36);
}

export type FactFindVehicle = {
  id: string;
  type: string;
  value: string;
  make: string;
  model: string;
  year: string;
  ownership: string;
};

export type FactFindProperty = {
  id: string;
  address: string;
  addressGeo: string;
  value: string;
  usage: string;
  ownership: string;
  rentalWeekly?: string;
};

export function emptyProperty(): FactFindProperty {
  return {
    id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    address: "",
    addressGeo: "",
    value: "",
    usage: "Owner occupied",
    ownership: "100",
    rentalWeekly: "",
  };
}

export function parseProperties(raw: string, fallbackValue = ""): FactFindProperty[] {
  if (raw?.trim()) {
    try {
      const parsed = JSON.parse(raw) as FactFindProperty[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* fall through */
    }
  }
  if (fallbackValue.trim()) {
    return [{ ...emptyProperty(), value: fallbackValue }];
  }
  return [];
}

export function propertiesTotal(rows: FactFindProperty[]) {
  return rows.reduce((sum, row) => sum + moneyNumber(row.value), 0);
}

export function emptyVehicle(): FactFindVehicle {
  return {
    id: `veh-${Date.now()}`,
    type: "Car",
    value: "",
    make: "",
    model: "",
    year: String(new Date().getFullYear()),
    ownership: "100",
  };
}

export type FactFindLiability = {
  id: string;
  type: string;
  limit: string;
  rate: string;
  term: string;
  repayment: string;
  lender: string;
  included: boolean;
  loanType?: string;
  offset?: string;
  repaymentType?: string;
  currentBalance?: string;
  interestRateType?: string;
  loanEnd?: string;
};

export const LIABILITY_TYPES = [
  "Existing Mortgage",
  "Lease",
  "Car Loan",
  "Personal Loan",
  "Other",
  "Margin",
  "Credit Card",
  "Overdraft",
  "BNPL",
  "HELP / HECS",
] as const;

export const MORTGAGE_LOAN_TYPES = [
  "Owner Occupied",
  "Investment",
  "Line of Credit",
] as const;

export const MORTGAGE_RATE_TYPES = ["Variable", "Fixed"] as const;

export const LIABILITY_LENDERS = [
  "AFG Home Loans",
  "AFS (Automotive Financial Services)",
  "Alex Bank",
  "Allstate Home Loans",
  "AMMF Australian Motorcycle & Marine Finance",
  "AMP",
  "Angle Finance",
  "ANZ",
  "Arab Bank of Australia",
  "Athena",
  "Aussie",
  "Australian Military Bank",
  "Australian Mutual Bank",
  "Australian Secure Capital Fund",
  "Australian Unity",
  "Auswide Bank",
  "Bank Australia",
  "Bank First",
  "Bank of China",
  "Bank of Heritage Isle",
  "Bank of Melbourne",
  "Bank of Queensland",
  "Bank of Sydney",
  "Bank of US",
  "BankSA",
  "BankVic",
  "BankWAW",
  "Bankwest",
  "BCU Bank",
  "Bendigo Bank",
  "Better Choice",
  "Beyond Bank",
  "Bizcap",
  "Bluestone",
  "Broken Hill Bank",
  "Building Society",
  "Cairns Bank",
  "Central Murray Bank",
  "Central West Credit Union",
  "Challenger",
  "Citi Bank",
  "Coastline Credit Union",
  "Commonwealth Bank (CBA)",
  "Community First Bank",
  "Credit Union SA",
  "Defence Bank",
  "Deposit Assure",
  "Deposit Bond Australia",
  "Deposit Power",
  "Earlypay",
  "Easy Street",
  "Family First Bank",
  "Finance One",
  "Fire Services Credit Union",
  "Firefighters Mutual Bank",
  "First Choice Credit Union",
  "First Option Bank",
  "Firstmac",
  "Flexi Commercial",
  "Funding",
  "G&C Mutual Bank",
  "Gateway Bank",
  "Geelong Bank",
  "Goulburn Murray Credit Union (GMCU)",
  "Granite Home Loans",
  "Great Southern Bank",
  "Greater Bank",
  "Green Light Auto Finance",
  "Health Professionals Bank",
  "Heartland Reverse Mortgages",
  "Heritage Bank",
  "HomeLoans.com.au",
  "Homestar",
  "HomeStart Finance",
  "Horizon Bank",
  "Household Capital",
  "HSBC",
  "Hume Bank",
  "Illawarra Credit Union",
  "IMB Bank",
  "ING Bank Australia",
  "Judo Bank",
  "Keystart",
  "La Trobe Financial",
  "Laboratories Credit Union",
  "Latitude Financial",
  "Liberty",
  "Loans.com.au",
  "Lumi Australia",
  "MA Money",
  "Macquarie Bank",
  "ME Bank",
  "Metro Finance",
  "MoneyPlace",
  "Mortgage Choice",
  "Mortgage Ezy",
  "Mortgage House",
  "Moula",
  "MOVE Bank",
  "MyState Bank",
  "NAB (National Australia Bank)",
  "Newcastle Permanent",
  "Northern Inland Credit Union",
  "NOW Finance",
  "Oak Capital",
  "OnDeck Australia",
  "Orange Credit Union",
  "P&N Bank",
  "Pacific Mortgage Group",
  "People's Choice",
  "Pepper Money",
  "Plenti",
  "Police Credit Union",
  "Prime Capital",
  "Prospa",
  "Qantas Money",
  "QBANK",
  "QBE",
  "Qudos Bank",
  "Queensland Country Bank",
  "RACQ Bank",
  "Reduce Home Loans",
  "RedZed",
  "Regional Australia Bank",
  "Resi",
  "Resimac Group",
  "ScotPac Business Finance",
  "Selfco Leasing",
  "Shift",
  "SocietyOne",
  "South West Slopes Bank",
  "Southern Cross Credit Union",
  "St George",
  "Sucasa",
  "Summerland Bank",
  "Suncorp",
  "Teachers Mutual Bank",
  "The Capricornian",
  "The Mac Credit Union",
  "The Mutual Bank",
  "Tradeplus24 Australia",
  "TrailBlazer Finance",
  "Transport Mutual Credit Union",
  "Ubank",
  "UniBank",
  "Unity Bank",
  "Unloan",
  "Up Bank",
  "Valiant Finance",
  "Virgin Money",
  "VMG",
  "Warwick Credit Union",
  "Well Money",
  "Westpac",
  "Wisr",
  "WLTH",
  "Yard",
  "Zip Business",
  "Other",
] as const;

export function emptyLiability(type = ""): FactFindLiability {
  return {
    id: `lia-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    limit: "",
    rate: "",
    term: "",
    repayment: "",
    lender: "",
    included: true,
    loanType: "",
    offset: "",
    repaymentType: "P&I",
    currentBalance: "",
    interestRateType: "",
    loanEnd: "",
  };
}

export type FactFindAdditionalIncome = {
  type: string;
  amount: string;
  frequency: string;
};

export type FactFindIncome = {
  id: string;
  type: string;
  otherSpecify: string;
  amount: string;
  frequency: string;
  additional: string;
  additionalItems: FactFindAdditionalIncome[];
  employer: string;
  workArrangement: string;
  occupation: string;
  startDate: string;
  endDate: string;
  current: boolean;
  businessName: string;
  businessStructure: string;
  abn: string;
};

export const INCOME_TYPES = ["PAYG/Employee", "Self employed", "Other"] as const;

export function isPaygIncome(type: string) {
  return type === "PAYG/Employee" || type === "PAYG" || type === "Salary or wage (PAYG)";
}

export function isSelfIncome(type: string) {
  return type === "Self employed";
}

export function isOtherIncome(type: string) {
  return type === "Other";
}

export const INCOME_FREQUENCIES = [
  "Per week",
  "Per fortnight",
  "Per month",
  "Per year",
] as const;

export const WORK_ARRANGEMENTS = ["Full time", "Part time", "Casual", "Contractor"] as const;

export const BUSINESS_STRUCTURES = ["Sole trader", "Company", "Partnership", "Trust"] as const;

export const ADDITIONAL_INCOME = ["Bonus", "Overtime", "Commission", "Allowances"] as const;

export function emptyIncome(): FactFindIncome {
  return {
    id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "",
    otherSpecify: "",
    amount: "",
    frequency: "Per year",
    additional: "",
    additionalItems: [],
    employer: "",
    workArrangement: "",
    occupation: "",
    startDate: "",
    endDate: "",
    current: true,
    businessName: "",
    businessStructure: "",
    abn: "",
  };
}

export function parseIncomes(raw: string): FactFindIncome[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as FactFindIncome[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => {
      let type = row.type ?? "";
      let otherSpecify = row.otherSpecify ?? "";
      if (type === "Salary or wage (PAYG)" || type === "PAYG") type = "PAYG/Employee";
      if (type === "Rental income") {
        type = "Other";
        otherSpecify = otherSpecify || "Rental income";
      }
      return { ...row, type, otherSpecify, additionalItems: parseAdditionalItems(row) };
    });
  } catch {
    return [];
  }
}

export function parseAdditionalItems(row: FactFindIncome): FactFindAdditionalIncome[] {
  if (Array.isArray(row.additionalItems) && row.additionalItems.length > 0) {
    return row.additionalItems.map((item) => ({
      type: item.type ?? "",
      amount: item.amount ?? "",
      frequency: item.frequency || "Per year",
    }));
  }
  const legacy = row.additional?.trim();
  if (!legacy) return [];
  try {
    const parsed = JSON.parse(legacy) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) =>
        typeof item === "string"
          ? { type: item, amount: "", frequency: "Per year" }
          : {
              type: String((item as FactFindAdditionalIncome).type ?? ""),
              amount: String((item as FactFindAdditionalIncome).amount ?? ""),
              frequency: String((item as FactFindAdditionalIncome).frequency || "Per year"),
            },
      );
    }
  } catch {
    return [{ type: legacy, amount: "", frequency: "Per year" }];
  }
  return [];
}

export function annualIncomeAmount(amount: string, frequency: string) {
  const n = moneyNumber(amount);
  if (frequency === "Per week") return n * 52;
  if (frequency === "Per fortnight") return n * 26;
  if (frequency === "Per month") return n * 12;
  if (frequency === "Per 2 months") return n * 6;
  return n;
}

export function incomeRowAnnualTotal(row: FactFindIncome) {
  const extras = parseAdditionalItems(row).reduce(
    (sum, item) => sum + annualIncomeAmount(item.amount, item.frequency),
    0,
  );
  return annualIncomeAmount(row.amount, row.frequency) + extras;
}

export function incomesAnnualTotal(rows: FactFindIncome[]) {
  return rows.reduce((sum, row) => sum + incomeRowAnnualTotal(row), 0);
}

export function isIncomeComplete(row: FactFindIncome) {
  if (!row.type.trim() || !row.amount.trim()) return false;
  if (isPaygIncome(row.type)) {
    const extrasOk = parseAdditionalItems(row).every((item) => item.amount.trim());
    return Boolean(
      row.employer.trim() &&
        row.occupation.trim() &&
        row.workArrangement.trim() &&
        row.startDate.trim() &&
        extrasOk,
    );
  }
  if (isSelfIncome(row.type)) {
    return Boolean(row.businessName.trim() && row.startDate.trim());
  }
  if (isOtherIncome(row.type)) {
    return Boolean((row.otherSpecify ?? "").trim());
  }
  return true;
}

export function parseLiabilities(raw: string): FactFindLiability[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as FactFindLiability[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => ({
      ...row,
      currentBalance: row.currentBalance ?? "",
      interestRateType: row.interestRateType ?? "",
      loanEnd: row.loanEnd ?? "",
    }));
  } catch {
    return [];
  }
}

export function isMortgageLiabilityComplete(row: FactFindLiability) {
  if (row.type !== "Existing Mortgage") return true;
  return Boolean(
    (row.currentBalance ?? "").trim() &&
      (row.interestRateType ?? "").trim() &&
      (row.loanEnd ?? "").trim(),
  );
}

export function liabilitiesFromLegacy(answers: Record<string, string>): FactFindLiability[] {
  const existing = parseLiabilities(answers.liabilitiesJson ?? "");
  if (existing.length > 0) return existing;
  const rows: FactFindLiability[] = [];
  if (answers.creditCards?.trim()) {
    rows.push({ ...emptyLiability("Credit Card"), limit: answers.creditCards });
  }
  if (answers.otherLoans?.trim()) {
    rows.push({ ...emptyLiability("Personal Loan"), limit: answers.otherLoans });
  }
  if (answers.hecs?.trim() && moneyNumber(answers.hecs) > 0) {
    rows.push({ ...emptyLiability("HELP / HECS"), limit: answers.hecs });
  }
  return rows;
}

export function parseVehicles(raw: string): FactFindVehicle[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as FactFindVehicle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function moneyNumber(value: string) {
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function rawAmount(value: string) {
  const cleaned = String(value ?? "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const [intPart, ...rest] = cleaned.split(".");
  const whole = intPart.replace(/^0+/, "") || (intPart ? "0" : "");
  const dec = rest.join("");
  return dec ? `${whole}.${dec}` : whole;
}

export function formatGroupedAmount(value: string) {
  const raw = rawAmount(value);
  if (!raw) return "";
  const [intPart, ...rest] = raw.split(".");
  const dec = rest.join("").slice(0, 2);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec ? `${grouped}.${dec}` : grouped;
}

export function formatMoney(value: string | number) {
  const n = typeof value === "number" ? value : moneyNumber(value);
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export function assetsTotal(answers: Record<string, string>) {
  const vehicles = parseVehicles(answers.vehiclesJson ?? "").reduce(
    (sum, item) => sum + moneyNumber(item.value),
    0,
  );
  const properties = parseProperties(answers.propertiesJson ?? "", answers.assetPropertyValue ?? "");
  const propertyTotal = propertiesTotal(properties);
  return (
    moneyNumber(answers.savingsTotal) +
    moneyNumber(answers.sharesTotal) +
    moneyNumber(answers.superTotal) +
    propertyTotal +
    moneyNumber(answers.homeContents) +
    moneyNumber(answers.otherAssets) +
    vehicles
  );
}

export function expensesMonthlyTotal(answers: Record<string, string>) {
  return Object.entries(answers).reduce((sum, [key, value]) => {
    if (!key.startsWith("exp.")) return sum;
    return sum + moneyNumber(value);
  }, 0);
}

export function liabilitiesBalanceTotal(rows: FactFindLiability[]) {
  return rows
    .filter((row) => row.included !== false)
    .reduce((sum, row) => {
      const balance = (row.currentBalance ?? "").trim();
      return sum + moneyNumber(balance || row.limit);
    }, 0);
}

export function dependantCount(answers: Record<string, string>) {
  const n = Number(answers.dependants);
  return Number.isFinite(n) && n > 0 ? Math.min(5, Math.floor(n)) : 0;
}

const EMPLOYMENT_JOB_FIELDS = ["employer", "occupation", "startDate"] as const;

export function isUnemployed(answers: Record<string, string>) {
  return answers.employmentType === "Unemployed";
}

export const EMPLOYMENT_TYPES = [
  "Employee",
  "Self employed",
  "Household duties",
  "Retired",
  "Unemployed",
  "Student",
] as const;

export function normalizeEmploymentType(type: string) {
  if (type === "PAYG" || type === "PAYG/Employee" || type === "Casual" || type === "Contract") {
    return "Employee";
  }
  if (type === "Self-employed") return "Self employed";
  return type;
}

export function isEmployeeType(type: string) {
  return normalizeEmploymentType(type) === "Employee";
}

export function isSelfEmploymentType(type: string) {
  return normalizeEmploymentType(type) === "Self employed";
}

export function isSituationEmployment(type: string) {
  return ["Household duties", "Retired", "Unemployed", "Student"].includes(
    normalizeEmploymentType(type),
  );
}

export type FactFindEmployment = {
  id: string;
  source?: "income" | "manual";
  incomeId?: string;
  type: string;
  employer: string;
  occupation: string;
  workArrangement: string;
  businessStructure: string;
  abn: string;
  startDate: string;
  endDate: string;
  current: boolean;
};

export function emptyEmployment(current = false): FactFindEmployment {
  return {
    id: `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source: "manual",
    type: "",
    employer: "",
    occupation: "",
    workArrangement: "",
    businessStructure: "",
    abn: "",
    startDate: "",
    endDate: "",
    current,
  };
}

export function parseEmployments(raw: string): FactFindEmployment[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as FactFindEmployment[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((job) => ({
      ...job,
      type: normalizeEmploymentType(job.type ?? ""),
      businessStructure: job.businessStructure ?? "",
      abn: job.abn ?? "",
    }));
  } catch {
    return [];
  }
}

export function incomeToEmployment(row: FactFindIncome): FactFindEmployment {
  const payg = isPaygIncome(row.type);
  return {
    id: `emp-${row.id}`,
    source: "income",
    incomeId: row.id,
    type: payg ? "Employee" : "Self employed",
    employer: payg ? row.employer : row.businessName,
    occupation: row.occupation,
    workArrangement: row.workArrangement || "",
    businessStructure: row.businessStructure || "",
    abn: row.abn || "",
    startDate: row.startDate,
    endDate: row.endDate,
    current: row.current,
  };
}

export function syncEmploymentsFromIncome(
  incomes: FactFindIncome[],
  existing: FactFindEmployment[],
  droppedIncomeIds: string[] = [],
): FactFindEmployment[] {
  const dropped = new Set(droppedIncomeIds.filter(Boolean));
  const jobIncomes = incomes.filter(
    (row) =>
      (isPaygIncome(row.type) || isSelfIncome(row.type)) &&
      Boolean(row.startDate || row.employer || row.businessName || row.occupation) &&
      !dropped.has(row.id),
  );
  const fromIncome = jobIncomes.map(incomeToEmployment);
  const manuals = existing.filter((job) => job.source !== "income");
  if (fromIncome.length === 0) return manuals;
  return [...fromIncome, ...manuals];
}

export function parseStringIds(raw: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function employmentIncomeKey(job: FactFindEmployment) {
  if (job.incomeId) return job.incomeId;
  if (job.id.startsWith("emp-")) return job.id.slice(4);
  return "";
}

export function resolveEmployments(answers: Record<string, string>): FactFindEmployment[] {
  const dropped = parseStringIds(answers.droppedEmploymentIncomeIds ?? "");
  const parsed = parseEmployments(answers.employmentsJson ?? "");
  if (answers.employmentsJson?.trim()) {
    return syncEmploymentsFromIncome(parseIncomes(answers.incomesJson ?? ""), parsed, dropped);
  }
  const fromIncome = syncEmploymentsFromIncome(parseIncomes(answers.incomesJson ?? ""), [], dropped);
  if (fromIncome.length > 0) return fromIncome;
  if (answers.employer?.trim() || answers.startDate?.trim()) {
    return [
      {
        id: "emp-legacy",
        source: "manual",
        type: normalizeEmploymentType(answers.employmentType || "Employee"),
        employer: answers.employer ?? "",
        occupation: answers.occupation ?? "",
        workArrangement: "",
        businessStructure: "",
        abn: "",
        startDate: answers.startDate ?? "",
        endDate: "",
        current: true,
      },
    ];
  }
  return [];
}

export function isEmploymentRowComplete(job: FactFindEmployment) {
  if (!normalizeEmploymentType(job.type).trim() || !job.startDate.trim()) return false;
  if (!job.current && !job.endDate.trim()) return false;
  if (isSituationEmployment(job.type)) return true;
  if (!job.employer.trim() || !job.occupation.trim()) return false;
  if (isEmployeeType(job.type) && !job.workArrangement.trim()) return false;
  return true;
}

export function earliestEmploymentStart(jobs: FactFindEmployment[]) {
  const dates = jobs.map((job) => job.startDate.trim()).filter(Boolean).sort();
  return dates[0] ?? "";
}

export function employmentMonthsCovered(jobs: FactFindEmployment[]) {
  return monthsSince(earliestEmploymentStart(jobs));
}

export function hasThreeYearEmployment(answers: Record<string, string>) {
  const months = employmentMonthsCovered(resolveEmployments(answers));
  return months != null && months >= 36;
}

export function currentEmploymentGapMessage(jobs: FactFindEmployment[]) {
  const covered = employmentMonthsCovered(jobs);
  if (covered == null) return null;
  if (covered >= 36) return null;
  const needed = 36 - covered;
  return `Your employment history is only ${formatYearsAndMonths(covered)}. You need ${needed} more month${needed === 1 ? "" : "s"}.`;
}

export function isEmploymentHistoryComplete(answers: Record<string, string>) {
  const jobs = resolveEmployments(answers);
  if (jobs.length === 0) return false;
  return jobs.every(isEmploymentRowComplete) && hasThreeYearEmployment(answers);
}

export const PROPERTY_USAGE_OPTIONS = ["To live-in", "As an investment"] as const;
export const LOAN_RATE_TYPES = ["Variable", "Fixed", "Both", "Unsure"] as const;
export const LOAN_REPAYMENT_TYPES = ["Principal & interest", "Interest only", "Unsure"] as const;
export const LOAN_TERMS = Array.from({ length: 30 }, (_, i) => (i === 0 ? "1 year" : `${i + 1} years`));
export const LOAN_FREQUENCIES = ["Weekly", "Fortnightly", "Monthly"] as const;
export const LOAN_FEATURES = [
  "Additional repayments",
  "Offset account",
  "Redraw facility",
  "Transaction account",
] as const;

export function normalizePropertyUsage(value: string) {
  if (value === "Investment" || value === "As an investment") return "As an investment";
  if (value === "To live-in" || value === "Owner occupier" || value === "Refinance") return "To live-in";
  return value;
}

export function isAuPostcode(value: string) {
  return /^\d{4}$/.test(value.trim());
}

export function parsePropertyPostcodes(raw: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item).trim()).filter(isAuPostcode);
  } catch {
    return raw.split(/[,\s]+/).map((item) => item.trim()).filter(isAuPostcode);
  }
}

export function parseLoanFeatures(raw: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

export function isPropertyDetailsComplete(answers: Record<string, string>) {
  if (!normalizePropertyUsage(answers.purpose ?? "").trim()) return false;
  if (!answers.purchasePrice?.trim()) return false;
  if (answers.hasPropertyInMind === "Yes") {
    return Boolean(answers.propertySearchAddress?.trim() && answers.propertySearchGeo === "1");
  }
  if (answers.hasPropertyInMind === "No") return true;
  return false;
}

export function isFactFindScreenComplete(
  answers: Record<string, string>,
  fieldIds: readonly string[],
) {
  if (fieldIds.length === 0) {
    return FACT_FIND_FIELDS.filter((f) => !f.optional).every((f) =>
      Boolean(answers[f.id]?.trim()),
    );
  }
  const fieldsDone = fieldIds.every((id) => {
    const field = FACT_FIND_FIELDS.find((f) => f.id === id);
    if (field?.optional) return true;
    if (isUnemployed(answers) && EMPLOYMENT_JOB_FIELDS.includes(id as (typeof EMPLOYMENT_JOB_FIELDS)[number])) {
      return true;
    }
    return Boolean(answers[id]?.trim());
  });
  if (!fieldsDone) return false;
  if (fieldIds.includes("dependants")) {
    const count = dependantCount(answers);
    const agesDone = Array.from({ length: count }, (_, i) =>
      Boolean(answers[`dependantAge${i + 1}`]?.trim()),
    ).every(Boolean);
    if (!agesDone) return false;
  }
  if (fieldIds.includes("hasDriverLicence")) {
    if ((answers.hasDriverLicence || "Yes") !== "No") {
      const licenceReady = ["licenceState", "licenceNumber", "licenceCardNumber", "licenceExpiry"].every(
        (id) => Boolean(answers[id]?.trim()),
      );
      if (!licenceReady) return false;
    }
    if (answers.nameChanged === "Yes" && !answers.previousLegalName?.trim()) return false;
    if (answers.residency === "Temporary resident" && !answers.visaType?.trim()) return false;
  }
  if (fieldIds.includes("currentAddress") || fieldIds.includes("moveInDate")) {
    if (answers.currentAddress?.trim() && answers.currentAddressGeo !== "1") return false;
    if (answers.postalSame === "No") {
      if (!answers.postalAddress?.trim() || answers.postalAddressGeo !== "1") return false;
    }
    const currentMonths = monthsSince(answers.moveInDate ?? "");
    if (currentMonths != null && currentMonths < 36) {
      return Boolean(
        answers.previousAddress?.trim() &&
          answers.previousAddressGeo === "1" &&
          answers.previousMoveIn?.trim(),
      );
    }
  }
  if (fieldIds.includes("liabilitiesJson")) {
    const rows = parseLiabilities(answers.liabilitiesJson ?? "");
    if (rows.some((row) => row.type.trim() && !row.repayment.trim())) return false;
    if (rows.some((row) => !isMortgageLiabilityComplete(row))) return false;
  }
  if (fieldIds.includes("incomesJson")) {
    const rows = parseIncomes(answers.incomesJson ?? "");
    if (rows.length === 0) return false;
    return rows.every(isIncomeComplete);
  }
  if (fieldIds.includes("hasPropertyInMind")) {
    return isPropertyDetailsComplete(answers);
  }
  if (fieldIds.includes("employmentType") || fieldIds.includes("employmentsJson")) {
    return isEmploymentHistoryComplete(answers);
  }
  return true;
}

export function factFindMissingRequired(
  answers: Record<string, string>,
  fieldIds: readonly string[],
) {
  const missing: string[] = [];
  for (const id of fieldIds) {
    const field = FACT_FIND_FIELDS.find((f) => f.id === id);
    if (!field || field.optional) continue;
    if (isUnemployed(answers) && EMPLOYMENT_JOB_FIELDS.includes(id as (typeof EMPLOYMENT_JOB_FIELDS)[number])) {
      continue;
    }
    if (!answers[id]?.trim()) missing.push(field.label);
  }
  if (fieldIds.includes("dependants")) {
    const count = dependantCount(answers);
    for (let i = 1; i <= count; i += 1) {
      if (!answers[`dependantAge${i}`]?.trim()) missing.push(`Dependant ${i} age`);
    }
  }
  if (fieldIds.includes("residency") && answers.residency === "Temporary resident") {
    if (!answers.visaType?.trim()) missing.push("Visa type");
  }
  if (fieldIds.includes("currentAddress") || fieldIds.includes("moveInDate")) {
    if (answers.currentAddress?.trim() && answers.currentAddressGeo !== "1") {
      missing.push("Verified current address");
    }
    const currentMonths = monthsSince(answers.moveInDate ?? "");
    if (currentMonths != null && currentMonths < 36) {
      if (
        !answers.previousAddress?.trim() ||
        answers.previousAddressGeo !== "1" ||
        !answers.previousMoveIn?.trim()
      ) {
        missing.push("Previous address");
      }
    }
  }
  if (fieldIds.includes("liabilitiesJson")) {
    const rows = parseLiabilities(answers.liabilitiesJson ?? "");
    if (rows.some((row) => row.type.trim() && !row.repayment.trim())) {
      missing.push("Monthly repayment");
    }
    if (rows.some((row) => row.type === "Existing Mortgage" && !isMortgageLiabilityComplete(row))) {
      missing.push("Mortgage details");
    }
  }
  if (fieldIds.includes("hasPropertyInMind")) {
    if (answers.hasPropertyInMind === "Yes") {
      if (!answers.propertySearchAddress?.trim() || answers.propertySearchGeo !== "1") {
        missing.push("Property address");
      }
    }
  }
  if (fieldIds.includes("employmentType") || fieldIds.includes("employmentsJson")) {
    if (!isUnemployed(answers) && !hasThreeYearEmployment(answers)) {
      missing.push("3 years of employment history");
    }
  }
  return missing;
}

const STORE_KEY = "portal:mortgage:v2";

const DEFAULT_BROKER: MortgageBroker = {
  name: "Mohit Chapagain",
  title: "Senior Mortgage Broker",
  phone: "0412 345 678",
  email: "mohit@finconnex.com.au",
  initials: "MC",
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return {
    firstName: parts[0] || "Client",
    lastName: parts.slice(1).join(" ") || "",
  };
}

export function formatAud(n: number) {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export function formatAudExact(n: number) {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function loanLvr(loan: ProposedLoan) {
  if (!loan.purchasePrice) return 0;
  return (loan.loanAmount / loan.purchasePrice) * 100;
}

/** Standard P&I monthly repayment. */
export function monthlyRepayment(principal: number, annualRate: number, years: number) {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

export function formatPortalStamp(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMessageAt(isoOrLabel: string) {
  const parsed = Date.parse(isoOrLabel);
  if (Number.isNaN(parsed)) return isoOrLabel;
  const d = new Date(parsed);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  }
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (
    d.getDate() === yest.getDate() &&
    d.getMonth() === yest.getMonth() &&
    d.getFullYear() === yest.getFullYear()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function greetingForHour(hour = new Date().getHours()) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function stageStatus(
  id: JourneyStageId,
  current: JourneyStageId,
): JourneyStageStatus {
  const order = JOURNEY_STAGES.map((s) => s.id);
  const i = order.indexOf(id);
  const c = order.indexOf(current);
  if (i < c) return "done";
  if (i === c) return "current";
  return "upcoming";
}

export function journeyPercent(current: JourneyStageId) {
  const idx = JOURNEY_STAGES.findIndex((s) => s.id === current);
  const marks = [14, 28, 45, 58, 72, 86, 100];
  return marks[idx] ?? 0;
}

export function factFindProgress(answers: Record<string, string>) {
  const required = FACT_FIND_FIELDS.filter((f) => !f.optional);
  const total = required.length;
  const filled = required.filter((f) => {
    if (isUnemployed(answers) && EMPLOYMENT_JOB_FIELDS.includes(f.id as (typeof EMPLOYMENT_JOB_FIELDS)[number])) {
      return true;
    }
    return Boolean(answers[f.id]?.trim());
  }).length;
  const remaining = total - filled;
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  return { total, filled, remaining, percent };
}

export function docsProgress(docs: MortgageDocument[]) {
  const accepted = docs.filter((d) => normalizeDocStatus(d.status) === "accepted").length;
  const underReview = docs.filter(
    (d) => !d.notApplicable && normalizeDocStatus(d.status) === "under-review",
  ).length;
  const rejected = docs.filter(
    (d) => !d.notApplicable && normalizeDocStatus(d.status) === "rejected",
  ).length;
  const notUploaded = docs.filter(
    (d) => !d.notApplicable && normalizeDocStatus(d.status) === "pending",
  ).length;
  const notApplicable = docs.filter((d) => d.notApplicable).length;
  const pending = notUploaded + rejected;
  const toComplete = docs.filter((d) => normalizeDocStatus(d.status) !== "accepted").length;
  return {
    accepted,
    underReview,
    rejected,
    notUploaded,
    notApplicable,
    pending,
    toComplete,
    submitted: underReview,
    received: accepted + underReview + notApplicable,
    total: docs.length,
  };
}

export function unreadMessages(messages: MortgageMessage[]) {
  return messages.filter((m) => m.from === "broker" && m.unread).length;
}

export function unreadNotifications(notes: MortgageNotification[]) {
  return notes.filter((n) => !n.read).length;
}

export function pendingDocuments(docs: MortgageDocument[]) {
  return docs.filter(isDocumentOutstanding);
}

function greystoneSeed(): MortgagePortalState {
  const now = new Date();
  const today1030 = new Date(now);
  today1030.setHours(10, 30, 0, 0);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(16, 15, 0, 0);
  const twoDays = new Date(now);
  twoDays.setDate(now.getDate() - 2);
  twoDays.setHours(11, 20, 0, 0);

  return {
    client: {
      firstName: "Raman",
      lastName: "Shrestha",
      email: "raman@greystone.example",
      phone: "0411 222 333",
      address: "14 Harbour View Rd, Pyrmont NSW 2009",
      preferredContact: "Phone",
    },
    broker: DEFAULT_BROKER,
    currentStage: "assessment",
    documents: [
      { id: "lic", name: "Driver Licence", status: "accepted", fileName: "Licence_Raman.pdf", uploadedAt: "18 Aug 2026" },
      { id: "payslips", name: "Payslips (3 months)", status: "accepted", fileName: "Payslips_Jun2026.pdf", uploadedAt: "23 Aug 2026" },
      { id: "medicare", name: "Medicare card", status: "accepted", fileName: "Medicare.jpg", uploadedAt: "18 Aug 2026" },
      { id: "address", name: "Proof of address", status: "accepted", fileName: "Rates_notice.pdf", uploadedAt: "19 Aug 2026" },
      { id: "empl", name: "Employment letter", status: "under-review", fileName: "Employment_letter.pdf", uploadedAt: "19 Aug 2026" },
      {
        id: "tax",
        name: "Latest tax return",
        status: "rejected",
        fileName: "Tax_2025.pdf",
        uploadedAt: "20 Aug 2026",
        rejectionReason: "The ATO notice of assessment is missing. Please upload the full return.",
      },
      { id: "contract", name: "Contract of sale", status: "under-review", fileName: "Contract_sale.pdf", uploadedAt: "21 Aug 2026" },
      { id: "bank", name: "Bank Statements (3 months)", status: "pending" },
      { id: "savings", name: "Savings Evidence", status: "pending" },
      { id: "gift-letter", name: "Gift letter (if applicable)", status: "pending" },
    ],
    messages: [
      {
        id: "m1",
        from: "broker",
        name: DEFAULT_BROKER.name,
        body: "Hi Raman — please upload your latest bank statements when you can. Assessment is underway and those three files will keep us moving.",
        at: today1030.toISOString(),
        unread: true,
      },
      {
        id: "m2",
        from: "client",
        name: "Raman Shrestha",
        body: "Thanks Mohit, I’ll get the bank statements and savings evidence across this week.",
        at: yesterday.toISOString(),
        unread: false,
      },
      {
        id: "m3",
        from: "broker",
        name: DEFAULT_BROKER.name,
        body: "Payslips for June look good. I’ve marked them received.",
        at: today1030.toISOString(),
        unread: true,
      },
    ],
    notifications: [
      {
        id: "n1",
        title: "Documents still required",
        body: "3 documents still needed to keep your application moving.",
        at: today1030.toISOString(),
        read: false,
        href: "documents",
      },
      {
        id: "n2",
        title: "New message from Mohit",
        body: "Please upload your latest bank statements when you can.",
        at: today1030.toISOString(),
        read: false,
        href: "messages",
      },
      {
        id: "n3",
        title: "Fact find updated",
        body: "Your fact find is 82% complete — 4 questions remaining.",
        at: twoDays.toISOString(),
        read: true,
        href: "fact-find",
      },
    ],
    timeline: [
      { id: "t1", title: "Payslips (June 2026) received", at: "Today, 10:30 AM", done: true },
      { id: "t2", title: "Document request sent: Bank Statements", at: "Yesterday, 4:15 PM", done: false },
      { id: "t3", title: "Fact Find updated", at: "22 Aug 2026, 11:20 AM", done: true },
      { id: "t4", title: "Driver licence received", at: "18 Aug 2026, 9:40 AM", done: true },
      { id: "t5", title: "Portal invite accepted", at: "11 Jul 2026, 8:40 AM", done: true },
    ],
    factFind: {
      preferredName: "Raman",
      title: "Mr.",
      firstName: "Raman",
      lastName: "Shrestha",
      gender: "Male",
      mobile: "0411 222 333",
      dependants: "0",
      streetAddress: "14 Harbour View Rd",
      addressSuburb: "Pyrmont",
      addressState: "NSW",
      addressPostcode: "2009",
      currentAddress: "14 Harbour View Rd, Pyrmont NSW 2009",
      currentAddressGeo: "1",
      livingArrangement: "I own my home with a mortgage",
      moveInDate: "2017-11",
      postalSame: "Yes",
      dob: "1992-03-14",
      residency: "Australian citizen",
      hasDriverLicence: "Yes",
      nameChanged: "No",
      licenceState: "NSW",
      employmentType: "Employee",
      employer: "Greystone Realty",
      occupation: "Operations Manager",
      startDate: "2021-02-01",
      employmentsJson: JSON.stringify([
        {
          id: "emp-greystone",
          source: "manual",
          type: "Employee",
          employer: "Greystone Realty",
          occupation: "Operations Manager",
          workArrangement: "Full time",
          startDate: "2021-02-01",
          endDate: "",
          current: true,
        },
      ]),
      annualIncome: "128000",
      purpose: "To live-in",
      hasPropertyInMind: "Yes",
      propertySearchAddress: "14 Harbour View Rd, Pyrmont NSW 2009",
      propertySearchGeo: "1",
      purchasePrice: "700000",
      suburb: "Pyrmont",
      deposit: "80000",
      creditCards: "6000",
      hecs: "0",
    },
    loan: {
      lender: "ABC Bank",
      loanAmount: 620000,
      purchasePrice: 700000,
      deposit: 80000,
      loanType: "Variable • P&I",
      rate: 6.19,
      termYears: 30,
    },
  };
}

function inviteSeed(
  portal: ClientPortal,
  card?: Pick<LeadCardData, "phone" | "custom" | "name">,
): MortgagePortalState {
  const { firstName, lastName } = splitName(portal.primaryContactName);
  const brokerName =
    portal.createdBy === "John Smith" ? DEFAULT_BROKER.name : portal.createdBy;
  const phone = card?.phone;
  const fromLead = card ? leadCustomToFactFind(card) : {};
  return {
    client: {
      firstName,
      lastName,
      email: portal.primaryContactEmail,
      phone: phone?.trim() || "",
      address: "",
      preferredContact: "Email",
    },
    broker: {
      ...DEFAULT_BROKER,
      name: brokerName,
      initials: initialsOf(brokerName),
    },
    currentStage: "fact-find",
    documents: [
      { id: "lic", name: "Driver Licence", status: "pending" },
      { id: "payslips", name: "Payslips (3 months)", status: "pending" },
      { id: "medicare", name: "Medicare card", status: "pending" },
      { id: "address", name: "Proof of address", status: "pending" },
      { id: "empl", name: "Employment letter", status: "pending" },
      { id: "tax", name: "Latest tax return", status: "pending" },
      { id: "bank", name: "Bank Statements (3 months)", status: "pending" },
      { id: "savings", name: "Savings Evidence", status: "pending" },
      { id: "gift-letter", name: "Gift letter (if applicable)", status: "pending" },
    ],
    messages: [
      {
        id: "welcome",
        from: "broker",
        name: brokerName,
        body: `Hi ${firstName} — your client portal is ready. Verify it's you, then complete your fact find and upload documents so we can keep your application moving.`,
        at: new Date().toISOString(),
        unread: true,
      },
    ],
    notifications: [
      {
        id: "n-welcome",
        title: "Welcome to your portal",
        body: "Verify your details, then start your fact find and documents.",
        at: new Date().toISOString(),
        read: false,
        href: "fact-find",
      },
    ],
    timeline: [
      {
        id: "t-invite",
        title: "Portal invite sent",
        at: formatPortalStamp(),
        done: true,
      },
    ],
    factFind: mergeFactFind(
      {
        preferredName: firstName,
        firstName,
        lastName,
        mobile: phone?.trim() || "",
      },
      fromLead,
    ),
    loan: {
      lender: "",
      loanAmount: 0,
      purchasePrice: 0,
      deposit: 0,
      loanType: "",
      rate: 0,
      termYears: 30,
    },
  };
}

export function ensureMortgageForLeadPortal(
  portal: ClientPortal,
  card?: Pick<LeadCardData, "phone" | "custom" | "name">,
) {
  const all = readAll();
  const existing = all[portal.slug];
  const phone = card?.phone;
  if (existing) {
    const prev = migrateState(existing);
    const { firstName, lastName } = splitName(portal.primaryContactName);
    const fromLead = card ? leadCustomToFactFind(card) : {};
    return saveMortgageState(portal.slug, {
      ...prev,
      client: {
        ...prev.client,
        firstName,
        lastName,
        email: portal.primaryContactEmail,
        phone: phone?.trim() || prev.client.phone,
      },
      factFind: mergeFactFind(fromLead, prev.factFind),
    });
  }
  return saveMortgageState(portal.slug, inviteSeed(portal, card));
}

function readAll(): Record<string, MortgagePortalState> {
  if (typeof window === "undefined") return {};
  try {
    const local = window.localStorage.getItem(STORE_KEY);
    if (local) return JSON.parse(local) as Record<string, MortgagePortalState>;
    const session = window.sessionStorage.getItem(STORE_KEY);
    if (session) {
      window.localStorage.setItem(STORE_KEY, session);
      return JSON.parse(session) as Record<string, MortgagePortalState>;
    }
    return {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, MortgagePortalState>) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(map);
  window.localStorage.setItem(STORE_KEY, raw);
  window.sessionStorage.setItem(STORE_KEY, raw);
  window.dispatchEvent(new CustomEvent("portal-mortgage-change"));
}

function seedFor(slug: string, portal: ClientPortal) {
  return slug === "greystone" ? greystoneSeed() : inviteSeed(portal);
}

function migrateState(state: MortgagePortalState): MortgagePortalState {
  const purpose = normalizePropertyUsage(state.factFind.purpose ?? "");
  return {
    ...state,
    documents: state.documents.map((d) => ({
      ...d,
      status: normalizeDocStatus(d.status),
    })),
    factFind: {
      ...state.factFind,
      ...(purpose ? { purpose } : {}),
    },
  };
}

export function getMortgageState(slug: string, portal: ClientPortal): MortgagePortalState {
  const all = readAll();
  if (all[slug]) return migrateState(all[slug]);
  return seedFor(slug, portal);
}

export function saveMortgageState(slug: string, next: MortgagePortalState) {
  const all = readAll();
  all[slug] = next;
  writeAll(all);
  return next;
}

export function patchMortgageState(
  slug: string,
  portal: ClientPortal,
  patch: (prev: MortgagePortalState) => MortgagePortalState,
) {
  const next = patch(getMortgageState(slug, portal));
  return saveMortgageState(slug, next);
}

function consentKey(slug: string) {
  return `portal:consent:${slug}`;
}

export function hasPortalConsent(slug: string, portal?: ClientPortal) {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(consentKey(slug))) return true;
  if (!portal) return false;
  return Boolean(getMortgageState(slug, portal).consent?.acceptedAtIso);
}

export function incrementPortalLoginCount(slug: string, portal: ClientPortal) {
  return patchMortgageState(slug, portal, (prev) => ({
    ...prev,
    loginCount: (prev.loginCount ?? 0) + 1,
  }));
}

export function recordPortalConsent(slug: string, portal: ClientPortal) {
  const iso = new Date().toISOString();
  const stamp = formatPortalStamp();
  if (typeof window !== "undefined") {
    sessionStorage.setItem(consentKey(slug), iso);
  }
  return patchMortgageState(slug, portal, (prev) => {
    if (prev.consent?.acceptedAtIso) return prev;
    return {
      ...prev,
      consent: { acceptedAt: stamp, acceptedAtIso: iso },
      timeline: [
        {
          id: `consent-${Date.now()}`,
          title: "Accepted Privacy Policy and Terms and Conditions",
          at: stamp,
          done: true,
        },
        ...prev.timeline,
      ],
    };
  });
}

export const PORTAL_RESOURCES = [
  {
    id: "first-home-buyer",
    title: "First Home Buyer Guide",
    blurb: "Grants, deposits, and what lenders look for.",
    icon: "home" as const,
  },
  {
    id: "home-loan-process",
    title: "Home Loan Process",
    blurb: "From fact find through to settlement.",
    icon: "route" as const,
  },
  {
    id: "calculators",
    title: "Calculators",
    blurb: "Estimate repayments on your proposed loan.",
    icon: "calc" as const,
  },
] as const;
