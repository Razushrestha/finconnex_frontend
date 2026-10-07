import { describe, expect, it } from "vitest";
import {
  defaultStampValue,
  fillKnownIdentityFields,
  isSignatureCaptureKind,
  knownIdentityValue,
  signingFieldAction,
} from "@/lib/documents/signature/field-kinds";

describe("signing field actions", () => {
  it("opens the signature popup only for signature and initials", () => {
    expect(isSignatureCaptureKind("signature")).toBe(true);
    expect(isSignatureCaptureKind("initials")).toBe(true);
    expect(isSignatureCaptureKind("SIGNATURE")).toBe(true);

    for (const kind of [
      "text",
      "date",
      "checkbox",
      "dropdown",
      "radio",
      "payment",
      "attachment",
      "image",
      "company",
      "job_title",
      "email",
      "stamp",
      "name",
    ]) {
      expect(isSignatureCaptureKind(kind)).toBe(false);
      expect(signingFieldAction(kind)).not.toBe("signature");
    }
  });

  it("maps each standard field to a distinct interaction", () => {
    expect(signingFieldAction("date")).toBe("date");
    expect(signingFieldAction("sign_date")).toBe("date");
    expect(signingFieldAction("checkbox")).toBe("checkbox");
    expect(signingFieldAction("dropdown")).toBe("choice");
    expect(signingFieldAction("radio")).toBe("choice");
    expect(signingFieldAction("attachment")).toBe("file");
    expect(signingFieldAction("image")).toBe("file");
    expect(signingFieldAction("stamp")).toBe("stamp");
    expect(signingFieldAction("text")).toBe("text");
    expect(signingFieldAction("company")).toBe("text");
    expect(signingFieldAction("job_title")).toBe("text");
    expect(signingFieldAction("payment")).toBe("text");
  });

  it("builds a stamp from signer initials", () => {
    expect(defaultStampValue("Ada Lovelace")).toBe("STAMP AL");
  });

  it("fills a blank name, email, and date from the person", () => {
    expect(knownIdentityValue("name", { name: "Ada Lovelace" })).toBe("Ada Lovelace");
    expect(knownIdentityValue("email", { email: "ada@example.com" })).toBe(
      "ada@example.com",
    );
    expect(knownIdentityValue("date", { name: "Ada" })).toBe("");
    expect(
      knownIdentityValue("date", { name: "Ada" }, { includeDate: true }),
    ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const filled = fillKnownIdentityFields(
      [
        { signerId: "s1", kind: "email", value: "" },
        { signerId: "s1", kind: "text", value: "" },
        { signerId: "s2", kind: "name", value: "" },
      ],
      { id: "s1", name: "Ada", email: "ada@example.com" },
    );
    expect(filled[0].value).toBe("ada@example.com");
    expect(filled[1].value).toBe("");
    expect(filled[2].value).toBe("");
  });
});
