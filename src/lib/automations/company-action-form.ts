/**
 * The Create Company step's form, shaped like the Create Company modal
 * (CreateCompanyForm), and its conversion to and from the step config. The
 * config holds the same API values the modal sends (createCrmCompany):
 * website as a URL, revenue as a decimal, size as the size band plus an
 * exact employee count when one was typed, notes as the description.
 */

import { asDecimalMoney, asEmployeeCount } from "@/lib/companies/api";
import { COMPANY_STATUSES, type CompanyStatus } from "@/lib/companies/types";
import { asHttpUrl, crmCompanySizeToUi, uiCompanySizeToCrm } from "@/lib/leads/api/map";

export interface CompanyActionFormState {
  companyName: string;
  website: string;
  industry: string;
  companySize: string;
  annualRevenue: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: CompanyStatus;
  ownerId: string;
  notes: string;
}

/** The modal's defaults (makeInitialState). */
export function emptyCompanyActionForm(): CompanyActionFormState {
  return {
    companyName: "",
    website: "",
    industry: "",
    companySize: "",
    annualRevenue: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "Australia",
    status: "Prospect",
    ownerId: "",
    notes: "",
  };
}

export function companyActionConfigFromForm(form: CompanyActionFormState): Record<string, unknown> {
  const text = (value: string) => value.trim() || undefined;
  const config: Record<string, unknown> = {
    name: form.companyName.trim(),
    website: asHttpUrl(form.website),
    industry: text(form.industry),
    size: uiCompanySizeToCrm(form.companySize),
    employeeCount: asEmployeeCount(form.companySize),
    annualRevenue: asDecimalMoney(form.annualRevenue),
    phone: text(form.phone),
    street: text(form.address),
    city: text(form.city),
    state: text(form.state),
    country: text(form.country),
    description: text(form.notes),
    ownerId: form.ownerId || undefined,
    // A new company starts Active; anything else is applied after creation.
    status: form.status === "Active" ? undefined : form.status.toUpperCase(),
  };
  for (const key of Object.keys(config)) if (config[key] === undefined) delete config[key];
  return config;
}

export function companyActionFormFromConfig(config: Record<string, unknown>): CompanyActionFormState {
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const saved = Object.keys(config).length > 0;
  const form = emptyCompanyActionForm();
  form.companyName = str(config.name);
  form.website = str(config.website);
  form.industry = str(config.industry);
  form.companySize =
    typeof config.employeeCount === "number"
      ? String(config.employeeCount)
      : (crmCompanySizeToUi(str(config.size)) ?? "");
  form.annualRevenue = str(config.annualRevenue);
  form.phone = str(config.phone);
  form.address = str(config.street);
  form.city = str(config.city);
  form.state = str(config.state);
  if (saved) form.country = str(config.country);
  const status = COMPANY_STATUSES.find((s) => s.toUpperCase() === str(config.status));
  // A saved step without a status creates an Active company.
  form.status = status ?? (saved ? "Active" : "Prospect");
  form.ownerId = str(config.ownerId);
  form.notes = str(config.description);
  return form;
}

/** The Create Company modal's required fields. */
export function companyActionProblems(form: CompanyActionFormState): string[] {
  const problems: string[] = [];
  if (!form.companyName.trim()) problems.push("Company Name is required");
  if (form.website.trim() && !asHttpUrl(form.website)) problems.push("Enter a valid website");
  if (!form.ownerId) problems.push("Owner is required");
  return problems;
}
