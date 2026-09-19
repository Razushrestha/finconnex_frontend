import { describe, expect, it } from "vitest";

import {
  emptyLeadActionForm,
  leadActionConfigFromForm,
  leadActionFormFromConfig,
  leadActionProblems,
  type LeadActionFormState,
} from "@/lib/automations/lead-action-form";

const OWNER = "11111111-1111-4111-8111-111111111111";
const PRIMARY = "22222222-2222-4222-8222-222222222222";
const SECONDARY = "33333333-3333-4333-8333-333333333333";
const FOLLOWER = "44444444-4444-4444-8444-444444444444";

const contact = (id: string, name: string) => ({
  id,
  name,
  email: `${name.toLowerCase()}@example.com`,
  phone: "",
  firstName: name,
  middleName: "",
  lastName: "",
});

function filled(patch: Partial<LeadActionFormState> = {}): LeadActionFormState {
  return {
    ...emptyLeadActionForm(false),
    contacts: [contact(PRIMARY, "Priya"), contact(SECONDARY, "Sam")],
    leadName: "  Home loan — Priya  ",
    pipelineStage: "Appointment Booked",
    leadSource: "Existing Client Referral",
    ownerId: OWNER,
    followerIds: [FOLLOWER],
    loanPurpose: "Refinance",
    tags: ["vip"],
    notes: " Referred by Jo ",
    ...patch,
  };
}

describe("Create Lead step form", () => {
  it("starts from the Create Lead modal's defaults", () => {
    const form = emptyLeadActionForm(true);
    expect(form.pipelineStage).toBe("New Lead");
    expect(form.useTriggerContact).toBe(true);
  });

  it("writes the lead from the picked contacts, with the API's values", () => {
    expect(leadActionConfigFromForm(filled())).toEqual({
      name: "Home loan — Priya",
      contactId: PRIMARY,
      secondaryContactId: SECONDARY,
      pipelineStage: "APPOINTMENT_BOOKED",
      source: "REFERRAL",
      ownerId: OWNER,
      followerIds: [FOLLOWER],
      loanPurpose: "Refinance",
      tags: ["vip"],
      notes: "Referred by Jo",
    });
  });

  it("leaves the primary contact to the trigger record when asked", () => {
    const config = leadActionConfigFromForm(
      filled({ useTriggerContact: true, secondaryContactId: SECONDARY }),
    );
    expect(config).not.toHaveProperty("contactId");
    expect(config.secondaryContactId).toBe(SECONDARY);
  });

  it("reads a saved step back into the same form", () => {
    const back = leadActionFormFromConfig(leadActionConfigFromForm(filled()), true);
    expect(back).toMatchObject({
      useTriggerContact: false,
      leadName: "Home loan — Priya",
      pipelineStage: "Appointment Booked",
      leadSource: "Existing Client Referral",
      ownerId: OWNER,
      followerIds: [FOLLOWER],
      loanPurpose: "Refinance",
      tags: ["vip"],
      notes: "Referred by Jo",
    });
    expect(back.contacts.map((c) => c.id)).toEqual([PRIMARY, SECONDARY]);
  });

  it("opens a new step on the trigger contact only when the trigger has one", () => {
    expect(leadActionFormFromConfig({}, true).useTriggerContact).toBe(true);
    expect(leadActionFormFromConfig({}, false).useTriggerContact).toBe(false);
  });

  it("asks for the Create Lead modal's required fields", () => {
    expect(leadActionProblems(filled(), false)).toEqual([]);
    expect(
      leadActionProblems(
        filled({ contacts: [], leadName: " ", leadSource: "", ownerId: "" }),
        true,
      ),
    ).toEqual([
      "Add a primary contact",
      "Lead name is required",
      "Lead source is required",
      "Lead owner is required",
    ]);
    expect(leadActionProblems(filled({ useTriggerContact: true }), false)[0]).toMatch(/no contact/);
    expect(
      leadActionProblems(filled({ contacts: [contact("c-local-1", "Offline")] }), true)[0],
    ).toMatch(/isn't saved to the CRM/);
  });
});
