import { afterEach, describe, expect, it, vi } from "vitest";
import { listFromIdentities, setApprovedSender } from "@/lib/emails/send-as";
import { setRulesActor } from "@/lib/rules/actor";

vi.mock("@/lib/user-profile/types", () => ({
  loadUserProfile: () => ({
    id: "",
    email: "",
    firstName: "",
    lastName: "",
    userName: "",
    displayName: "",
    phone: "",
    jobTitle: "",
    avatar: "",
    globalRole: "",
    isVerified: false,
  }),
}));

describe("listFromIdentities", () => {
  afterEach(() => {
    setApprovedSender(null);
    setRulesActor({
      name: "John Smith",
      email: "admin@finconnex.com",
      role: "Manager",
    });
  });

  it("uses the signed-in mailbox, not a hardcoded demo sender", () => {
    setRulesActor({
      name: "QA Tester",
      email: "qa.tester@example.com",
      role: "Manager",
    });
    const identities = listFromIdentities();
    expect(identities[0]?.email).toBe("qa.tester@example.com");
    expect(identities[0]?.name).toBe("QA Tester");
    expect(identities.some((item) => item.email.includes("bishnu"))).toBe(false);
  });

  it("returns no From identity when the session has no email", () => {
    setRulesActor({ name: "No Mail", role: "Manager" });
    expect(listFromIdentities()).toEqual([]);
  });

  it("prefers the workspace approved sender when one is configured", () => {
    setRulesActor({ name: "Binay", role: "Manager" });
    setApprovedSender({
      email: "hello@finconnex.com",
      name: "FinConnex",
      kind: "shared",
    });
    expect(listFromIdentities()[0]?.email).toBe("hello@finconnex.com");
  });
});
