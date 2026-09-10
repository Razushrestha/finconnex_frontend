import { describe, expect, it } from "vitest";
import {
  nameLinkedToContact,
  rankRelatedRecordsByContact,
} from "@/lib/activities/related-records";

describe("nameLinkedToContact", () => {
  it("links a contact to a lead titled with that name", () => {
    expect(nameLinkedToContact("Mohit - Home loans", "Mohit")).toBe(true);
    expect(nameLinkedToContact("Mohit - Home loans", "Mohit Sharma")).toBe(true);
    expect(nameLinkedToContact("Atlas CRM Rollout", "Mohit")).toBe(false);
  });
});

describe("rankRelatedRecordsByContact", () => {
  it("puts the contact-linked lead first", () => {
    const ranked = rankRelatedRecordsByContact(
      [
        { kind: "Lead", name: "Jamie Cole" },
        { kind: "Lead", name: "Mohit - Home loans" },
      ],
      "Mohit",
    );
    expect(ranked[0]?.name).toBe("Mohit - Home loans");
    expect(ranked[1]?.name).toBe("Jamie Cole");
  });
});
