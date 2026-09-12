import { describe, expect, it } from "vitest";
import {
  isValidPhoneInput,
  optionalPhoneError,
  requireDialablePhone,
  toE164,
} from "@/lib/contacts/phone";

describe("isValidPhoneInput", () => {
  it("allows an empty optional phone", () => {
    expect(isValidPhoneInput("")).toBe(true);
    expect(isValidPhoneInput("   ")).toBe(true);
  });

  it("rejects letters such as xyzabc", () => {
    expect(isValidPhoneInput("xyzabc")).toBe(false);
    expect(isValidPhoneInput("0400abc123")).toBe(false);
  });

  it("accepts formatted numbers", () => {
    expect(isValidPhoneInput("+61 400 000 000")).toBe(true);
    expect(isValidPhoneInput("(02) 1234 5678")).toBe(true);
    expect(isValidPhoneInput("0400-000-000")).toBe(true);
  });

  it("rejects too-short digit strings", () => {
    expect(isValidPhoneInput("12345")).toBe(false);
  });

  it("requires a value when required", () => {
    expect(isValidPhoneInput("", true)).toBe(false);
  });

  it("optionalPhoneError rejects junk like aa", () => {
    expect(optionalPhoneError("")).toBeUndefined();
    expect(optionalPhoneError("aa")).toBe("Enter a valid phone number");
    expect(optionalPhoneError("ascccc")).toBe("Enter a valid phone number");
    expect(optionalPhoneError("+61 400 000 000")).toBeUndefined();
  });
});

describe("toE164 / requireDialablePhone", () => {
  it("rejects xyzabc before a call is attempted", () => {
    expect(toE164("xyzabc")).toBeUndefined();
    expect(toE164("aa")).toBeUndefined();
    expect(toE164("ascccc")).toBeUndefined();
    const result = requireDialablePhone("xyzabc", "John Doe");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("E.164");
      expect(result.message).toContain("John Doe");
    }
  });

  it("normalizes Australian mobiles", () => {
    expect(toE164("0400000000")).toBe("+61400000000");
    expect(requireDialablePhone("+61 400 000 000", "Alex").ok).toBe(true);
  });
});
