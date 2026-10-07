import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { withCatalogOnSettings } from "@/lib/settings/catalog-fallback";

const crmResponse = JSON.stringify({
  statusCode: 200,
  data: {
    workspaceId: "ws-1",
    primaryColor: "#DB2777",
    catalog: {
      "organization/branding": { primaryColor: "#DB2777" },
    },
  },
});

const staleLocal = {
  "organization/branding": { primaryColor: "#5A32A3" },
  "communication/sms": { sender: "FinConnex" },
};

function catalogOf(text: string) {
  return (JSON.parse(text) as { data: { catalog: Record<string, unknown> } }).data
    .catalog;
}

describe("withCatalogOnSettings", () => {
  it("keeps the CRM's saved pages when the CRM wins, so every tab sees the saved brand", () => {
    const catalog = catalogOf(
      withCatalogOnSettings(crmResponse, staleLocal, undefined, { crmWins: true }),
    );
    expect(catalog["organization/branding"]).toEqual({ primaryColor: "#DB2777" });
    // Pages the CRM never stored still come from the local copy.
    expect(catalog["communication/sms"]).toEqual({ sender: "FinConnex" });
  });

  it("lets local pages replace the CRM's by default, for saves the CRM refused", () => {
    const catalog = catalogOf(withCatalogOnSettings(crmResponse, staleLocal));
    expect(catalog["organization/branding"]).toEqual({ primaryColor: "#5A32A3" });
  });
});
