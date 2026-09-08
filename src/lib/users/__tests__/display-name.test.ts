import { describe, expect, it } from "vitest";

import { ownerDisplayName, ownerDisplayNameOr } from "@/lib/users/display-name";

const UUID = "3985fe6e-0676-4eed-b1a2-5c0a9f0d1e34";

describe("ownerDisplayName", () => {
  it("never returns a uuid, from any position", () => {
    // The original bug: the lead board printed `lead.ownerId` under
    // "Lead Owner" because the mapper assigned the id to a display field.
    expect(ownerDisplayName(UUID)).toBe("");
    expect(ownerDisplayName({ name: UUID })).toBe("");
    expect(ownerDisplayName({ name: UUID }, UUID)).toBe("");
    expect(ownerDisplayNameOr("Unassigned", UUID)).toBe("Unassigned");
  });

  it("prefers a resolved name", () => {
    expect(ownerDisplayName({ name: "Ada Lovelace" })).toBe("Ada Lovelace");
    expect(
      ownerDisplayName({ name: "Ada Lovelace", firstName: "Grace" }),
    ).toBe("Ada Lovelace");
  });

  it("falls back to first + last, then to the email local part", () => {
    expect(
      ownerDisplayName({ firstName: "Grace", lastName: "Hopper" }),
    ).toBe("Grace Hopper");
    expect(ownerDisplayName({ firstName: "Grace" })).toBe("Grace");
    expect(ownerDisplayName({ lastName: "Hopper" })).toBe("Hopper");
    expect(ownerDisplayName({ email: "grace@example.com" })).toBe("grace");
  });

  it("skips a uuid-only candidate and keeps looking", () => {
    // Leads send `owner` and `ownerName`; contacts/companies/deals send
    // `owner` only. A caller passes both and the first usable one wins.
    expect(ownerDisplayName({ name: UUID }, { name: "Ada" })).toBe("Ada");
    expect(ownerDisplayName(null, undefined, "", { name: "Ada" })).toBe("Ada");
  });

  it("trims and treats whitespace as absent", () => {
    expect(ownerDisplayName({ name: "  Ada  " })).toBe("Ada");
    expect(ownerDisplayName({ name: "   " }, { name: "Ada" })).toBe("Ada");
  });

  it("returns the caller's placeholder when nobody is assigned", () => {
    expect(ownerDisplayNameOr("Unassigned", null)).toBe("Unassigned");
    expect(ownerDisplayNameOr("—", undefined, {})).toBe("—");
    expect(ownerDisplayName()).toBe("");
  });

  it("reads the shapes each endpoint actually returns", () => {
    // Leads: presenter attaches `name` plus the raw columns.
    expect(
      ownerDisplayName({
        id: UUID,
        name: "RR Test",
        firstName: "RR",
        lastName: "Test",
        email: "rrtest@example.com",
      } as never),
    ).toBe("RR Test");
    // Contacts/companies/deals: relation columns only, no derived name.
    expect(
      ownerDisplayName({
        firstName: "RR",
        lastName: "Test",
        email: "rrtest@example.com",
      }),
    ).toBe("RR Test");
  });
});
