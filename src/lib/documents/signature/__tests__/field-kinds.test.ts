import { describe, expect, it } from "vitest";
import {
  defaultStampValue,
  isSignatureCaptureKind,
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
});
