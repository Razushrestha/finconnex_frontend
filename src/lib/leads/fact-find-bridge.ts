import type { LeadCardData } from "@/lib/leads/types";
import { ALL_LIVING_EXPENSE_ITEMS } from "@/lib/portals/living-expenses";

export type ApplicantRole = "primary" | "secondary";

const ALIASES: Record<string, string[]> = {
  title: ["title", "salutation"],
  lastName: ["lastName", "surname"],
  marital: ["marital", "relationshipStatus"],
  mobile: ["mobile", "phone"],
  postalSame: ["postalSame", "postalSameAsResidential"],
  dob: ["dob", "dateOfBirth"],
  residency: ["residency", "residencyStatus"],
  employer: ["employer", "employerName"],
  startDate: ["startDate", "employmentStartDate"],
  desiredLoanAmount: ["desiredLoanAmount", "loanAmount"],
  purchasePrice: ["purchasePrice", "propertyPrice"],
  previousMoveIn: ["previousMoveIn", "previousMoveInDate"],
  previousMoveOut: ["previousMoveOut", "previousMoveOutDate"],
};

const PORTAL_FIELD_IDS = [
  "preferredName",
  "title",
  "titleOther",
  "firstName",
  "middleName",
  "lastName",
  "gender",
  "mobile",
  "marital",
  "dependants",
  "dependantAge1",
  "dependantAge2",
  "dependantAge3",
  "dependantAge4",
  "dependantAge5",
  "currentAddress",
  "currentAddressGeo",
  "streetAddress",
  "addressSuburb",
  "addressState",
  "addressPostcode",
  "livingArrangement",
  "moveInDate",
  "postalSame",
  "postalAddress",
  "postalAddressGeo",
  "previousAddress",
  "previousAddressGeo",
  "previousMoveIn",
  "previousMoveOut",
  "dob",
  "residency",
  "visaType",
  "hasDriverLicence",
  "licenceState",
  "licenceNumber",
  "licenceCardNumber",
  "licenceExpiry",
  "nameChanged",
  "previousLegalName",
  "employmentType",
  "employer",
  "occupation",
  "startDate",
  "employmentsJson",
  "droppedEmploymentIncomeIds",
  "annualIncome",
  "otherIncome",
  "incomesJson",
  "purpose",
  "hasPropertyInMind",
  "propertySearchAddress",
  "propertySearchGeo",
  "propertyPostcodes",
  "purchasePrice",
  "suburb",
  "deposit",
  "desiredLoanAmount",
  "loanAmountUnsure",
  "rateType",
  "repaymentTypePref",
  "loanTerm",
  "repaymentFrequency",
  "loanFeatures",
  "otherLoanRequirements",
  "creditCards",
  "otherLoans",
  "hecs",
  "liabilitiesJson",
  "gift",
  "savingsTotal",
  "sharesTotal",
  "superTotal",
  "superInstitution",
  "assetPropertyValue",
  "propertiesJson",
  "vehiclesJson",
  "homeContents",
  "otherAssets",
  ...ALL_LIVING_EXPENSE_ITEMS.map((item) => item.key),
];

function prefixKey(role: ApplicantRole, key: string) {
  return role === "primary" ? key : `secondary.${key}`;
}

function normalizeRead(id: string, value: string) {
  if (!value) return value;
  if (id === "title" && value === "Mr") return "Mr.";
  if (id === "residency" && value === "Australian Citizen") {
    return "Australian citizen";
  }
  if (id === "dependants" && /^none$/i.test(value)) return "0";
  if (
    id === "gender" &&
    (value === "Non-binary" || value === "Prefer not to say")
  ) {
    return "Other";
  }
  if (id === "livingArrangement" && value === "Renting") return "I am renting";
  return value;
}

function readCustom(
  card: Pick<LeadCardData, "name" | "phone" | "custom">,
  key: string,
) {
  const value = card.custom?.[key];
  return value !== undefined && value !== "" ? value : "";
}

export function readLeadFactFindValue(
  card: Pick<LeadCardData, "name" | "phone" | "custom">,
  id: string,
  role: ApplicantRole = "primary",
) {
  const aliases = ALIASES[id] ?? [id];
  for (const alias of aliases) {
    if (role === "primary" && (alias === "mobile" || alias === "phone")) {
      const mobile =
        readCustom(card, "mobile") || readCustom(card, "phone") || card.phone;
      if (mobile) return normalizeRead(id, mobile);
      continue;
    }
    const value = readCustom(card, prefixKey(role, alias));
    if (value) return normalizeRead(id, value);
  }
  if (role === "primary") {
    const parts = card.name.trim().split(/\s+/).filter(Boolean);
    if (id === "firstName" && !readCustom(card, "firstName") && parts[0]) {
      return parts[0];
    }
    if (
      id === "lastName" &&
      !readCustom(card, "lastName") &&
      !readCustom(card, "surname") &&
      parts.length > 1
    ) {
      return parts[parts.length - 1];
    }
  }
  return "";
}

export function writeLeadFactFindKeys(
  id: string,
  value: string,
  role: ApplicantRole,
) {
  const custom: Record<string, string> = {};
  const aliases = ALIASES[id] ?? [id];
  for (const alias of aliases) {
    custom[prefixKey(role, alias)] = value;
  }
  return custom;
}

export function leadCustomToFactFind(
  card: Pick<LeadCardData, "name" | "phone" | "custom">,
) {
  const answers: Record<string, string> = {};
  for (const id of PORTAL_FIELD_IDS) {
    const value = readLeadFactFindValue(card, id);
    if (value) answers[id] = value;
  }
  return answers;
}

export function mergeFactFind(
  fromLead: Record<string, string>,
  existing?: Record<string, string>,
) {
  const next = { ...fromLead };
  if (!existing) return next;
  for (const [key, value] of Object.entries(existing)) {
    if (value?.trim()) next[key] = value;
  }
  return next;
}
