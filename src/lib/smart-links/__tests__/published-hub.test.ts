import { describe, expect, it } from "vitest";
import { asPublishedHub, mapHubResponse } from "@/lib/smart-links/api";

describe("asPublishedHub", () => {
  it("treats a public hub with no published flag as live", () => {
    const hub = asPublishedHub({
      id: "5d7bd336-529d-46ee-868f-b77f2049e090",
      slug: "raju-shrestha",
      title: "Raju shrestha",
      bio: "Engineer by profession",
    });
    expect(hub?.published).toBe(true);
    expect(hub?.profile.slug).toBe("raju-shrestha");
  });

  it("keeps a listed hub live when the server omits published", () => {
    const hub = mapHubResponse({
      id: "5d7bd336-529d-46ee-868f-b77f2049e090",
      slug: "raju-shrestha",
      title: "Raju shrestha",
    });
    expect(hub.published).toBe(true);
    expect(hub.profile.slug).toBe("raju-shrestha");
  });

  it("keeps a hub hidden when the server marks it unpublished", () => {
    const hub = asPublishedHub({
      slug: "raju-shrestha",
      title: "Raju shrestha",
      published: false,
    });
    expect(hub?.published).toBe(false);
  });
});
