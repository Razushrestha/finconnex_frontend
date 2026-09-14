import { describe, expect, it } from "vitest";
import {
  invalidEmailMessage,
  isEmailAddress,
  partitionEmailAddresses,
} from "@/lib/emails/address";

describe("email address format", () => {
  it("rejects strings without @ or a domain", () => {
    expect(isEmailAddress("testtest")).toBe(false);
    expect(isEmailAddress("test@")).toBe(false);
    expect(isEmailAddress("@example.com")).toBe(false);
    expect(isEmailAddress("test@localhost")).toBe(false);
    expect(isEmailAddress("not an email")).toBe(false);
  });

  it("accepts a normal mailbox", () => {
    expect(isEmailAddress("ada@example.com")).toBe(true);
    expect(isEmailAddress("  Ada@Example.co.uk  ")).toBe(true);
  });

  it("keeps valid tokens and reports invalid ones", () => {
    expect(partitionEmailAddresses("testtest, ada@example.com; bad")).toEqual({
      valid: ["ada@example.com"],
      invalid: ["testtest", "bad"],
    });
    expect(invalidEmailMessage(["testtest"])).toMatch(/testtest/);
  });
});
