import { describe, it } from "vitest";
import {
  smokeCampaignsPortalsMock,
  smokeCampaignsPortalsWiring,
} from "@/lib/campaigns/smoke";

describe("Campaigns + Client Portals CRM API", () => {
  it("wires Swagger campaigns and client-portals into the UI", () => {
    smokeCampaignsPortalsWiring();
  });

  it("mock clients hit /v1/campaigns and /v1/client-portals", async () => {
    await smokeCampaignsPortalsMock();
  });
});
