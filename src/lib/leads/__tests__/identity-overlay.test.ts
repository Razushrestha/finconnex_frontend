import { describe, expect, it } from "vitest";
import { applyLocalLeadIdentity, pinLeadIdentity } from "@/lib/leads/store";
import type { LeadCardData } from "@/lib/leads/types";

function card(partial: Partial<LeadCardData>): LeadCardData {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Jane Smith",
    initials: "JS",
    company: "",
    email: "jane@example.com",
    phone: "",
    owner: "Ramesh Pudasaini",
    createdDate: "10/09/2026",
    source: "Facebook",
    accentColorClass: "bg-violet-500",
    avatarBgClass: "bg-violet-500",
    ...partial,
  };
}

describe("applyLocalLeadIdentity", () => {
  it("keeps the saved lead title and owner over CRM contact/assignment values", () => {
    const remote = card({});
    const local = card({
      name: "Harry",
      owner: "Binay",
      ownerId: "22222222-2222-4222-8222-222222222222",
      custom: {
        leadTitle: "Harry",
        leadOwnerName: "Binay",
        leadOwnerId: "22222222-2222-4222-8222-222222222222",
        contactName: "Jane Smith",
      },
    });
    const next = applyLocalLeadIdentity(remote, local);
    expect(next.name).toBe("Harry");
    expect(next.owner).toBe("Binay");
    expect(next.ownerId).toBe("22222222-2222-4222-8222-222222222222");
    expect(next.custom?.contactName).toBe("Jane Smith");
  });

  it("keeps locally saved tags when the CRM payload omitted them", () => {
    const next = applyLocalLeadIdentity(
      card({ tags: [] }),
      card({ tags: ["Hot", "Website"] }),
    );
    expect(next.tags).toEqual(["Hot", "Website"]);
  });

  it("leaves remote identity alone when the user did not pin a title", () => {
    const next = applyLocalLeadIdentity(card({}), card({ custom: { contactId: "c1" } }));
    expect(next.name).toBe("Jane Smith");
    expect(next.owner).toBe("Ramesh Pudasaini");
  });

  it("keeps a pinned title/owner even when the local card is missing after refresh", () => {
    pinLeadIdentity(
      card({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        email: "harry-pin@example.com",
        name: "Harry",
        owner: "Binay",
        ownerId: "22222222-2222-4222-8222-222222222222",
        custom: {
          leadTitle: "Harry",
          leadOwnerName: "Binay",
          leadOwnerId: "22222222-2222-4222-8222-222222222222",
        },
      }),
    );
    const next = applyLocalLeadIdentity(
      card({
        id: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA",
        email: "harry-pin@example.com",
      }),
    );
    expect(next.name).toBe("Harry");
    expect(next.owner).toBe("Binay");
  });
});

describe("applyLocalLeadIdentity after the CRM record changes", () => {
  const OWNER_A = "22222222-2222-4222-8222-222222222222";
  const OWNER_B = "33333333-3333-4333-8333-333333333333";

  /** A card as mapCrmLeadToCard builds it: the CRM's own name and owner recorded. */
  function fromCrm(name: string, owner: string, ownerId: string): LeadCardData {
    return card({ name, owner, ownerId, custom: { crmName: name, crmOwnerId: ownerId } });
  }

  /** The local card after Create Lead: the typed title and chosen owner. */
  const local = card({
    name: "Priya",
    owner: "Binay",
    ownerId: OWNER_A,
    custom: {
      leadTitle: "Priya",
      leadOwnerName: "Binay",
      leadOwnerId: OWNER_A,
      crmName: "Priya Priya",
      crmOwnerId: OWNER_A,
    },
  });

  it("keeps the typed title while the CRM name has not changed", () => {
    const next = applyLocalLeadIdentity(fromCrm("Priya Priya", "Binay K", OWNER_A), local);
    expect(next.name).toBe("Priya");
    expect(next.owner).toBe("Binay");
  });

  it("shows a name the CRM changed since the last sync, such as an automation rename", () => {
    const next = applyLocalLeadIdentity(fromCrm("Sam Lee", "Binay K", OWNER_A), local);
    expect(next.name).toBe("Sam Lee");
    expect(next.custom?.leadTitle).toBe("Sam Lee");
    expect(next.custom?.crmName).toBe("Sam Lee");
    // The owner did not change, so the chosen owner label stays.
    expect(next.owner).toBe("Binay");
  });

  it("shows an owner the CRM changed since the last sync", () => {
    const next = applyLocalLeadIdentity(fromCrm("Priya Priya", "Ramesh", OWNER_B), local);
    expect(next.ownerId).toBe(OWNER_B);
    expect(next.owner).toBe("Ramesh");
    expect(next.custom?.leadOwnerId).toBe(OWNER_B);
    expect(next.custom?.crmOwnerId).toBe(OWNER_B);
    expect(next.name).toBe("Priya");
  });

  it("keeps the new name on the following refresh", () => {
    const renamed = applyLocalLeadIdentity(fromCrm("Sam Lee", "Binay K", OWNER_A), local);
    const again = applyLocalLeadIdentity(fromCrm("Sam Lee", "Binay K", OWNER_A), renamed);
    expect(again.name).toBe("Sam Lee");
  });

  it("does not treat a card built outside the CRM as a CRM change", () => {
    const next = applyLocalLeadIdentity(card({ name: "Someone Else", ownerId: OWNER_B }), local);
    expect(next.name).toBe("Priya");
    expect(next.owner).toBe("Binay");
  });
});
