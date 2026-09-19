import { describe, expect, it } from "vitest";

import {
  CONTACT_ACTION_STATUSES,
  contactActionConfigFromForm,
  contactActionFormFromConfig,
  contactActionProblems,
  emptyContactActionForm,
  type ContactActionFormState,
} from "@/lib/automations/contact-action-form";

const OWNER = "11111111-1111-4111-8111-111111111111";
const COMPANY = "22222222-2222-4222-8222-222222222222";

function filled(patch: Partial<ContactActionFormState> = {}): ContactActionFormState {
  return {
    ...emptyContactActionForm(false),
    firstName: " Alex ",
    lastName: "Morgan",
    email: "alex@company.com",
    phone: "+61 400 000 000",
    mobile: "+61 411 000 000",
    companyId: COMPANY,
    leadSource: "Referral Partner",
    status: "Inactive",
    ownerId: OWNER,
    ...patch,
  };
}

describe("Create Contact step form", () => {
  it("starts from the Create Contact modal's defaults", () => {
    expect(emptyContactActionForm(false).status).toBe("Active");
  });

  it("writes the contact with the API's values", () => {
    expect(contactActionConfigFromForm(filled())).toEqual({
      firstName: "Alex",
      lastName: "Morgan",
      email: "alex@company.com",
      phone: "+61 400 000 000",
      mobilePhone: "+61 411 000 000",
      companyId: COMPANY,
      source: "PARTNER",
      status: "INACTIVE",
      ownerId: OWNER,
    });
    expect(contactActionConfigFromForm(filled({ status: "Active" }))).not.toHaveProperty("status");
  });

  it("copies the person from the trigger lead instead of fixed details", () => {
    const config = contactActionConfigFromForm(filled({ copyFromTrigger: true }));
    expect(config.copyFromTrigger).toBe(true);
    for (const key of ["firstName", "lastName", "email", "phone", "mobilePhone"]) {
      expect(config).not.toHaveProperty(key);
    }
    expect(config).toMatchObject({ companyId: COMPANY, ownerId: OWNER });
  });

  it("reads a saved step back into the same form", () => {
    const back = contactActionFormFromConfig(contactActionConfigFromForm(filled()), true);
    expect(back).toMatchObject({
      copyFromTrigger: false,
      firstName: "Alex",
      email: "alex@company.com",
      mobile: "+61 411 000 000",
      companyId: COMPANY,
      leadSource: "Referral Partner",
      status: "Inactive",
      ownerId: OWNER,
    });
  });

  it("copies from a lead trigger by default for a new step", () => {
    expect(contactActionFormFromConfig({}, true).copyFromTrigger).toBe(true);
    expect(contactActionFormFromConfig({}, false).copyFromTrigger).toBe(false);
  });

  it("asks for the modal's required fields", () => {
    expect(contactActionProblems(filled(), false)).toEqual([]);
    expect(
      contactActionProblems(filled({ firstName: "", lastName: "", email: "nope", ownerId: "" }), false),
    ).toEqual(["First Name is required", "Last Name is required", "Enter a valid email", "Owner is required"]);
    expect(contactActionProblems(filled({ copyFromTrigger: true }), false)[0]).toMatch(/lead trigger/);
    expect(contactActionProblems(filled({ copyFromTrigger: true, firstName: "" }), true)).toEqual([]);
  });

  it("offers only statuses the CRM stores", () => {
    expect([...CONTACT_ACTION_STATUSES]).toEqual(["Active", "Inactive", "Unsubscribed"]);
  });
});
