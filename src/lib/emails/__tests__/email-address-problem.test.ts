import { describe, expect, it } from "vitest";

import { emailAddressProblem } from "@/lib/emails/address";

describe("emailAddressProblem", () => {
  it("accepts real addresses", () => {
    for (const ok of [
      "ram@gmail.com",
      "a.b+tag@finconnex.com.au",
      "info@ktm.com.np",
      "me@studio.photography",
      "x@sub-domain.example.co.uk",
    ]) {
      expect(emailAddressProblem(ok), ok).toBeNull();
    }
  });

  it("suggests the provider for a mistyped ending", () => {
    expect(emailAddressProblem("ram@gmail.comcomcom")).toBe("Did you mean ram@gmail.com?");
    expect(emailAddressProblem("sita@yahoo.comm")).toBe("Did you mean sita@yahoo.com?");
  });

  it("refuses endings that are not real top-level domains", () => {
    expect(emailAddressProblem("ram@company.comcomcom")).toMatch(/not a real email domain ending/);
    expect(emailAddressProblem("ram@company.c0m")).toMatch(/not a real email domain ending/);
  });

  it("refuses malformed addresses", () => {
    for (const bad of ["", "ram", "ram@", "@gmail.com", "ram@@gmail.com", "ram@gmail", "ram@-x.com", "ra m@gmail.com", "ram..x@gmail.com", "ram@gmail..com"]) {
      expect(emailAddressProblem(bad), bad).not.toBeNull();
    }
  });
});
