import { describe, expect, it } from "vitest";

import {
  companyActionConfigFromForm,
  companyActionFormFromConfig,
  companyActionProblems,
  emptyCompanyActionForm,
  type CompanyActionFormState,
} from "@/lib/automations/company-action-form";

const OWNER = "11111111-1111-4111-8111-111111111111";

function filled(patch: Partial<CompanyActionFormState> = {}): CompanyActionFormState {
  return {
    ...emptyCompanyActionForm(),
    companyName: " Acme Lending ",
    website: "acme.com.au",
    industry: "Finance",
    companySize: "42",
    annualRevenue: "$1,250,000",
    phone: "+61 2 9000 0000",
    address: "1 George St",
    city: "Sydney",
    state: "NSW",
    ownerId: OWNER,
    notes: "Key account",
    ...patch,
  };
}

describe("Create Company step form", () => {
  it("starts from the Create Company modal's defaults", () => {
    expect(emptyCompanyActionForm()).toMatchObject({ country: "Australia", status: "Prospect" });
  });

  it("writes the same API values the modal sends", () => {
    const config = companyActionConfigFromForm(filled());
    expect(config).toMatchObject({
      name: "Acme Lending",
      website: "https://acme.com.au/",
      industry: "Finance",
      employeeCount: 42,
      annualRevenue: "1250000.00",
      phone: "+61 2 9000 0000",
      street: "1 George St",
      city: "Sydney",
      state: "NSW",
      country: "Australia",
      description: "Key account",
      ownerId: OWNER,
      status: "PROSPECT",
    });
    expect(companyActionConfigFromForm(filled({ status: "Active" }))).not.toHaveProperty("status");
  });

  it("leaves empty fields out", () => {
    const config = companyActionConfigFromForm({ ...emptyCompanyActionForm(), companyName: "Acme", ownerId: OWNER });
    expect(Object.keys(config).sort()).toEqual(["country", "name", "ownerId", "status"]);
  });

  it("reads a saved step back into the same form", () => {
    const back = companyActionFormFromConfig(companyActionConfigFromForm(filled({ status: "Customer" })));
    expect(back).toMatchObject({
      companyName: "Acme Lending",
      industry: "Finance",
      companySize: "42",
      annualRevenue: "1250000.00",
      address: "1 George St",
      country: "Australia",
      status: "Customer",
      ownerId: OWNER,
      notes: "Key account",
    });
    expect(companyActionFormFromConfig({}).status).toBe("Prospect");
  });

  it("asks for the modal's required fields", () => {
    expect(companyActionProblems(filled())).toEqual([]);
    expect(companyActionProblems(filled({ companyName: " ", ownerId: "", website: "not a site" }))).toEqual([
      "Company Name is required",
      "Enter a valid website",
      "Owner is required",
    ]);
  });
});
