import { describe, expect, it } from "vitest";

import {
  dealActionConfigFromForm,
  dealActionFormFromConfig,
  dealActionProblems,
  emptyDealActionForm,
  type DealActionFormState,
} from "@/lib/automations/deal-action-form";

const OWNER = "11111111-1111-4111-8111-111111111111";
const COMPANY = "22222222-2222-4222-8222-222222222222";
const CONTACT = "33333333-3333-4333-8333-333333333333";

function filled(patch: Partial<DealActionFormState> = {}): DealActionFormState {
  return {
    ...emptyDealActionForm(false),
    dealName: " Refinance — Priya ",
    accountId: COMPANY,
    contactId: CONTACT,
    leadSource: "Existing Client Referral",
    stage: "Proposal",
    probability: "50",
    dealValue: "450000",
    currency: "AUD",
    ownerId: OWNER,
    description: "Next steps",
    ...patch,
  };
}

describe("Create Deal step form", () => {
  it("starts from the Create Deal modal's defaults", () => {
    expect(emptyDealActionForm(false)).toMatchObject({
      stage: "Prospecting",
      probability: "10",
      currency: "AUD",
    });
  });

  it("writes the values the modal sends, plus the linked contact", () => {
    expect(dealActionConfigFromForm(filled())).toEqual({
      name: "Refinance — Priya",
      companyId: COMPANY,
      contactId: CONTACT,
      source: "REFERRAL",
      stage: "PROPOSAL",
      probability: 50,
      value: "450000.00",
      currency: "AUD",
      ownerId: OWNER,
      description: "Next steps",
    });
  });

  it("closes a set time after the workflow runs, or on a fixed date", () => {
    const relative = dealActionConfigFromForm(filled({ closeIn: { amount: 2, unit: "weeks" } }));
    expect(relative.expectedCloseInMs).toBe(14 * 86_400_000);
    expect(relative).not.toHaveProperty("expectedCloseDate");
    const fixed = dealActionConfigFromForm(
      filled({ closeMode: "date", expectedCloseDate: "2026-12-01", closeIn: { amount: 2, unit: "weeks" } }),
    );
    expect(fixed.expectedCloseDate).toBe("2026-12-01T00:00:00.000Z");
    expect(fixed).not.toHaveProperty("expectedCloseInMs");
    expect(dealActionConfigFromForm(filled())).not.toHaveProperty("expectedCloseInMs");
  });

  it("links the trigger's contact instead of a picked one when asked", () => {
    const config = dealActionConfigFromForm(filled({ contactFromTrigger: true }));
    expect(config.contactFromTrigger).toBe(true);
    expect(config).not.toHaveProperty("contactId");
  });

  it("only sends lost reason and competitor for Closed Lost", () => {
    const lost = dealActionConfigFromForm(
      filled({ stage: "Closed Lost", lostReason: "No Budget", competitor: "Other Bank" }),
    );
    expect(lost).toMatchObject({ stage: "CLOSED_LOST", lostReason: "NO_BUDGET", competitor: "Other Bank" });
    const open = dealActionConfigFromForm(filled({ lostReason: "No Budget", competitor: "Other Bank" }));
    expect(open).not.toHaveProperty("lostReason");
    expect(open).not.toHaveProperty("competitor");
  });

  it("reads a saved step back into the same form", () => {
    const back = dealActionFormFromConfig(
      dealActionConfigFromForm(filled({ stage: "Closed Lost", lostReason: "No Budget", closeIn: { amount: 30, unit: "days" } })),
      true,
    );
    expect(back).toMatchObject({
      dealName: "Refinance — Priya",
      accountId: COMPANY,
      contactFromTrigger: false,
      contactId: CONTACT,
      leadSource: "Existing Client Referral",
      stage: "Closed Lost",
      probability: "50",
      closeMode: "relative",
      closeIn: { amount: 30, unit: "days" },
      dealValue: "450000.00",
      ownerId: OWNER,
      lostReason: "No Budget",
    });
  });

  it("asks for the modal's required fields", () => {
    const opts = { triggerHasContact: true, accountsExist: true };
    expect(dealActionProblems(filled(), opts)).toEqual([]);
    expect(
      dealActionProblems(
        filled({ dealName: "", accountId: "", dealValue: "", ownerId: "", stage: "Closed Lost" }),
        opts,
      ),
    ).toEqual([
      "Deal Name is required",
      "Select a CRM company",
      "Deal Value is required",
      "Owner is required",
      "Lost Reason is required for Closed Lost",
    ]);
    expect(dealActionProblems(filled({ accountId: "" }), { ...opts, accountsExist: false })).toEqual([]);
    expect(dealActionProblems(filled({ contactFromTrigger: true }), { ...opts, triggerHasContact: false })[0]).toMatch(
      /no contact/,
    );
  });
});
