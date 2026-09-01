import { describe, expect, it } from "vitest";
import {
  asHttpUrl,
  mapCrmLeadToCard,
  toCrmCreateBody,
  uiCompanySizeToCrm,
} from "@/lib/leads/api/map";
import type { CrmLead } from "@/lib/leads/api/types";
import { leadCardDataToRecord } from "@/lib/leads/card-view-model";
import { leadLocation } from "@/lib/leads/detail-snapshot";

const sampleLead: CrmLead = {
  id: "11111111-1111-1111-1111-111111111111",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "+61 400 000 000",
  jobTitle: "Analyst",
  industry: "Finance",
  companyName: "Analytical Engines",
  companyWebsite: "https://engines.example",
  companySize: "SMALL",
  notes: "Prefers morning calls",
  productInterest: "Home loan",
  budgetRange: "$500k–$700k",
  linkedinUrl: "https://linkedin.com/in/ada",
  city: "Melbourne",
  state: "VIC",
  status: "NEW",
  source: "WEBSITE",
  estimatedValue: "120000.00",
};

describe("lead CRM field mapping", () => {
  it("maps company size labels and free text to CRM enums", () => {
    expect(uiCompanySizeToCrm("SMALL")).toBe("SMALL");
    expect(uiCompanySizeToCrm("10–49")).toBe("SMALL");
    expect(uiCompanySizeToCrm("1-9")).toBe("MICRO");
    expect(uiCompanySizeToCrm("enterprise")).toBe("ENTERPRISE");
  });

  it("prefixes bare domains as https URLs", () => {
    expect(asHttpUrl("acme.com")).toBe("https://acme.com");
    expect(asHttpUrl("https://acme.com")).toBe("https://acme.com");
    expect(asHttpUrl("not-a-url")).toBeUndefined();
  });

  it("copies CRM extras onto the card and record", () => {
    const card = mapCrmLeadToCard(sampleLead);
    expect(card.jobTitle).toBe("Analyst");
    expect(card.industry).toBe("Finance");
    expect(card.companyWebsite).toBe("https://engines.example");
    expect(card.companySize).toBe("10–49");
    expect(card.notes).toBe("Prefers morning calls");
    expect(card.productInterest).toBe("Home loan");
    expect(card.linkedinUrl).toBe("https://linkedin.com/in/ada");
    expect(leadLocation(card)).toBe("Melbourne, VIC");

    const record = leadCardDataToRecord(card, "New");
    expect(record.jobTitle).toBe("Analyst");
    expect(record.companySize).toBe("10–49");
    expect(record.notes).toBe("Prefers morning calls");
  });

  it("sends company size and website on create", () => {
    const body = toCrmCreateBody({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      company: "Analytical Engines",
      companyWebsite: "engines.example",
      companySize: "SMALL",
      jobTitle: "Analyst",
      notes: "Prefers morning calls",
      linkedinUrl: "linkedin.com/in/ada",
    });
    expect(body.companySize).toBe("SMALL");
    expect(body.companyWebsite).toBe("https://engines.example");
    expect(body.linkedinUrl).toBe("https://linkedin.com/in/ada");
    expect(body.notes).toBe("Prefers morning calls");
    expect(body.jobTitle).toBe("Analyst");
  });
});
