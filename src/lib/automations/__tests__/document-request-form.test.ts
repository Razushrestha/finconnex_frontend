import { describe, expect, it } from "vitest";

import {
  autoTitle,
  documentRequestConfigFromForm,
  documentRequestFormFromConfig,
  documentRequestProblems,
  emptyDocumentRequestForm,
  type DocumentRequestFormState,
} from "@/lib/automations/document-request-form";

const SENDER = "11111111-1111-4111-8111-111111111111";
const CONTACT = "22222222-2222-4222-8222-222222222222";

const applicant = (name: string, recordId?: string) => ({
  id: `ap-${name}`,
  source: "contact" as const,
  email: "",
  name,
  deliverVia: "email" as const,
  recordId,
});

function filled(patch: Partial<DocumentRequestFormState> = {}): DocumentRequestFormState {
  return {
    ...emptyDocumentRequestForm(false),
    senderId: SENDER,
    applicants: [applicant("Binayak Karki", CONTACT)],
    selected: { 1: ["id-licence", "id-passport"], 2: [] },
    notes: " Upload by Friday ",
    ...patch,
  };
}

describe("Request Documents step form", () => {
  it("fills the title the way the page does", () => {
    expect(autoTitle(filled())).toBe("Property purchase - Binayak");
    expect(autoTitle(filled({ template: "Home loan — refinance" }))).toBe("Home loan — refinance - Binayak");
    expect(autoTitle(filled({ applicantFromTrigger: true }))).toBe("Property purchase");
  });

  it("writes what the CRM stores, one item per ticked document", () => {
    expect(documentRequestConfigFromForm(filled())).toEqual({
      title: "Property purchase - Binayak",
      documentType: "OTHER",
      requestedFromId: CONTACT,
      requestedById: SENDER,
      dueInMs: 7 * 86_400_000,
      items: [{ name: "Driver licence" }, { name: "Passport" }],
      notes: "Upload by Friday",
    });
  });

  it("asks the workflow's contact when chosen", () => {
    const config = documentRequestConfigFromForm(filled({ applicantFromTrigger: true }));
    expect(config.requestedFromTrigger).toBe(true);
    expect(config).not.toHaveProperty("requestedFromId");
  });

  it("names whose document each item is when there are two applicants", () => {
    const config = documentRequestConfigFromForm(
      filled({
        applicants: [applicant("Binayak Karki", CONTACT), applicant("Sita Karki")],
        selected: { 1: ["id-licence"], 2: ["id-passport"] },
      }),
    );
    expect(config.items).toEqual([{ name: "Driver licence — Binayak" }, { name: "Passport — Sita" }]);
    expect(config.title).toBe("Property purchase - Binayak, Sita");
  });

  it("reads a saved step back, matching documents to the catalogue", () => {
    const saved = documentRequestConfigFromForm(
      filled({
        dueMode: "date",
        dueDate: "2027-01-10T17:00",
        extras: { other: [{ id: "x-1", title: "Council rates notice", description: "" }] },
        selected: { 1: ["id-licence", "x-1"], 2: [] },
        titleEdited: true,
        title: "Refi docs",
      }),
    );
    const back = documentRequestFormFromConfig(saved, true);
    expect(back).toMatchObject({
      applicantFromTrigger: false,
      senderId: SENDER,
      dueMode: "date",
      dueDate: "2027-01-10T17:00",
      title: "Refi docs",
      titleEdited: true,
      notes: "Upload by Friday",
    });
    expect(back.applicants[0].recordId).toBe(CONTACT);
    expect(back.selected[1]).toContain("id-licence");
    expect(back.extras.other?.map((item) => item.title)).toEqual(["Council rates notice"]);
  });

  it("puts a two-applicant step's documents back under each applicant", () => {
    const saved = documentRequestConfigFromForm(
      filled({
        applicants: [applicant("Binayak Karki", CONTACT), applicant("Sita Karki")],
        selected: { 1: ["id-licence"], 2: ["id-passport"] },
      }),
    );
    const back = documentRequestFormFromConfig(saved, false);
    expect(back.applicants.map((a) => a.name)).toEqual(["", "Sita"]);
    expect(back.selected).toEqual({ 1: ["id-licence"], 2: ["id-passport"] });
  });

  it("checks each step the way the page does", () => {
    const opts = { triggerHasContact: true };
    expect(documentRequestProblems(filled(), opts)).toEqual([]);
    expect(
      documentRequestProblems(filled({ senderId: "", applicants: [], selected: { 1: [], 2: [] } }), {
        ...opts,
        step: 1,
      }),
    ).toEqual(["Choose who the request is sent on behalf of", "Add an applicant from your contacts"]);
    expect(documentRequestProblems(filled({ selected: { 1: [], 2: [] } }), opts)).toContain(
      "Select at least one document",
    );
    expect(
      documentRequestProblems(filled({ applicantFromTrigger: true }), { triggerHasContact: false })[0],
    ).toMatch(/no contact/);
    expect(
      documentRequestProblems(filled({ dueMode: "date", dueDate: "2020-01-01T09:00" }), opts),
    ).toContain("Due date must be in the future");
  });
});
