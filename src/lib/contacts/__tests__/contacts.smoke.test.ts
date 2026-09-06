import { describe, expect, it } from "vitest";
import { normalizeCrmContacts } from "@/lib/contacts/api";
import {
  smokeContactsMock,
  smokeContactsWiring,
} from "@/lib/contacts/smoke";

describe("Contacts API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeContactsWiring();
  });

  it("mocks list/get/create/update/bulk/import/merge/delete", async () => {
    await smokeContactsMock();
  });

  it("reads Nest board columns from records, not as fake cards", () => {
    const mapped = normalizeCrmContacts([
      {
        status: "ACTIVE",
        total: 1,
        records: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            status: "ACTIVE",
          },
        ],
      },
      { status: "INACTIVE", total: 0, records: [] },
    ]);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.contact.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(mapped[0]?.contact.email).toBe("ada@example.com");
    expect(mapped[0]?.status).toBe("Active");
  });

  it("unwraps a single create envelope as one contact", () => {
    const mapped = normalizeCrmContacts({
      statusCode: 201,
      data: {
        id: "22222222-2222-4222-8222-222222222222",
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace@example.com",
        status: "ACTIVE",
      },
    });
    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.contact.id).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
