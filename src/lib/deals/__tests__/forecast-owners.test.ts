import { describe, expect, it } from "vitest";
import { forecastOwnersFromPayload, normalizeDeal } from "@/lib/deals/api";
import { resolveDealContact } from "@/lib/sales/resolve-contact";

describe("sales deal fields", () => {
  it("maps forecast owner rows", () => {
    const owners = forecastOwnersFromPayload({
      owners: [
        {
          ownerId: "owner-1",
          ownerName: "Ada Khan",
          pipeline: "120000.00",
          bestCase: "60000.00",
          committed: "40000.00",
          closed: "20000.00",
        },
      ],
    });
    expect(owners).toEqual([
      {
        id: "owner-1",
        owner: "Ada Khan",
        pipeline: 120000,
        bestCase: 60000,
        committed: 40000,
        closed: 20000,
      },
    ]);
  });

  it("keeps company, contact, and email from the deal payload", () => {
    const deal = normalizeDeal(
      {
        id: "deal-1",
        name: "Greystone",
        stage: "NEGOTIATION",
        value: "620000.00",
        currency: "AUD",
        company: { id: "co-1", name: "Acme" },
        dealContacts: [
          {
            contactId: "contact-1",
            contact: {
              id: "contact-1",
              firstName: "Priya",
              lastName: "Shah",
              email: "priya@example.com",
            },
          },
        ],
      },
      0,
    );
    expect(deal.account).toBe("Acme");
    expect(deal.contact).toBe("Priya Shah");
    expect(deal.contactEmail).toBe("priya@example.com");
    expect(resolveDealContact(deal)).toMatchObject({
      name: "Priya Shah",
      email: "priya@example.com",
    });
  });
});
