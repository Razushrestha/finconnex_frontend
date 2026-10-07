import { describe, expect, it } from "vitest";
import { pickDeletedRecordId } from "@/lib/recycle-bin/api";

const CONTACT = "11111111-1111-4111-8111-111111111111";

describe("pickDeletedRecordId", () => {
  it("uses the contact id when the deleted row contains the email", () => {
    expect(
      pickDeletedRecordId(
        [
          {
            id: "bin-row",
            entityId: CONTACT,
            snapshot: { email: "Razu@Example.com" },
          },
        ],
        "razu@example.com",
      ),
    ).toBe(CONTACT);
  });

  it("reads a nested contact email", () => {
    expect(
      pickDeletedRecordId(
        [{ id: CONTACT, contact: { email: "ada@example.com" } }],
        "ada@example.com",
      ),
    ).toBe(CONTACT);
  });

  it("restores the only deleted contact when the bin row has no email", () => {
    expect(
      pickDeletedRecordId([{ id: CONTACT, label: "Ram" }], "ada@example.com", true),
    ).toBe(CONTACT);
  });

  it("does not guess when several deleted contacts omit the email", () => {
    expect(
      pickDeletedRecordId(
        [
          { id: CONTACT, label: "Ram" },
          { id: "22222222-2222-4222-8222-222222222222", label: "Sita" },
        ],
        "ada@example.com",
        true,
      ),
    ).toBe("");
  });
});
