import { describe, expect, it } from "vitest";
import { fromCrmQuestions, toCrmQuestions } from "@/lib/booking/crm-questions";

describe("booking form ↔ CRM questions", () => {
  const form = [
    { id: "name", label: "Name", required: true },
    { id: "q_radio", label: "Test Radio", required: true, fieldType: "radio", options: ["Yes", "No"] },
    { id: "q_addr", label: "Address", required: false, fieldType: "address", addressParts: [{ id: "line1", label: "Line 1", enabled: true }] },
    { id: "q_med", label: "Conditions", required: false, fieldType: "multiline", ephi: true, hidden: true },
    { id: "q_radio", label: "Duplicate", required: false },
  ];

  it("sends each field once, in the shape the CRM validates", () => {
    const crm = toCrmQuestions(form);
    expect(crm.map((q) => q.key)).toEqual(["name", "q_radio", "q_addr", "q_med"]);
    expect(crm[1]).toEqual({
      key: "q_radio",
      label: "Test Radio",
      type: "SELECT",
      required: true,
      options: ["Yes", "No"],
      uiType: "radio",
    });
    expect(crm[2]).toMatchObject({ type: "TEXTAREA", uiType: "address", settings: { addressParts: [{ id: "line1" }] } });
    expect(crm[3]).toMatchObject({ hidden: true, settings: { ephi: true } });
  });

  it("reads the CRM's questions back into the same form", () => {
    const round = fromCrmQuestions(toCrmQuestions(form.slice(0, 4)));
    expect(round).toEqual([
      { id: "name", label: "Name", required: true, fieldType: "single_line" },
      { id: "q_radio", label: "Test Radio", required: true, fieldType: "radio", options: ["Yes", "No"] },
      { id: "q_addr", label: "Address", required: false, fieldType: "address", addressParts: [{ id: "line1", label: "Line 1", enabled: true }] },
      { id: "q_med", label: "Conditions", required: false, hidden: true, fieldType: "multiline", ephi: true },
    ]);
  });

  it("ignores malformed rows and a missing list", () => {
    expect(fromCrmQuestions(null)).toEqual([]);
    expect(fromCrmQuestions([{ key: "" }, "x", { key: "k", label: "K", type: "SELECT" }])).toEqual([
      { id: "k", label: "K", required: false, fieldType: "dropdown" },
    ]);
  });
});
