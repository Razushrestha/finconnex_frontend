import { describe, expect, it } from "vitest";
import { applyLocalLeadIdentity } from "@/lib/leads/store";
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

  it("leaves remote identity alone when the user did not pin a title", () => {
    const next = applyLocalLeadIdentity(card({}), card({ custom: { contactId: "c1" } }));
    expect(next.name).toBe("Jane Smith");
    expect(next.owner).toBe("Ramesh Pudasaini");
  });
});
