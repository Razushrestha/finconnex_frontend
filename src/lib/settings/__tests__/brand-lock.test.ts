import { describe, expect, it } from "vitest";
import {
  parseRememberedBrand,
  selectWorkspaceBrand,
} from "@/lib/settings/brand";
import type { CrmWorkspaceSettings } from "@/lib/settings/api";

const remembered = { p: "#0F172A", s: "#1E293B", n: "Test Test" };

describe("selectWorkspaceBrand", () => {
  it("keeps the saved brand when settings are a bare fallback", () => {
    const fallback = {
      workspaceId: "ws",
      revision: 1,
      catalog: {
        "organization/branding": { primaryColor: "#6376B5", secondaryColor: "#BF83B8" },
        "organization/company-profile": { companyName: "FinConnex" },
      },
    } as CrmWorkspaceSettings;
    const brand = selectWorkspaceBrand(fallback, null, remembered);
    expect(brand.primary).toBe("#0F172A");
    expect(brand.secondary).toBe("#1E293B");
    expect(brand.appName).toBe("Test Test");
  });

  it("uses the live workspace brand when settings were actually saved", () => {
    const live = {
      id: "settings-1",
      updatedAt: "2026-10-12T00:00:00.000Z",
      primaryColor: "#111827",
      secondaryColor: "#334155",
      catalog: {
        "organization/company-profile": { companyName: "Test Test" },
      },
    } as CrmWorkspaceSettings;
    const brand = selectWorkspaceBrand(live, null, remembered);
    expect(brand.primary).toBe("#111827");
    expect(brand.appName).toBe("Test Test");
  });

  it("rejects a brand cookie that is not two colours", () => {
    expect(parseRememberedBrand("%7B%7D")).toBeNull();
    expect(parseRememberedBrand(JSON.stringify(remembered))?.n).toBe("Test Test");
  });
});

describe("remembered brand cookie", () => {
  const cookie = encodeURIComponent(
    JSON.stringify({ p: "#1F6FEB", s: "#0EA5E9", n: "Acme", t: "solid", w: "ws-1" }),
  );

  it("keeps the colour style and workspace", () => {
    expect(parseRememberedBrand(cookie, "ws-1")).toMatchObject({
      p: "#1F6FEB",
      t: "solid",
      w: "ws-1",
    });
  });

  it("ignores a brand saved for another workspace", () => {
    expect(parseRememberedBrand(cookie, "ws-2")).toBeNull();
  });

  it("paints the remembered style until live settings arrive", () => {
    const remembered = parseRememberedBrand(cookie, "ws-1");
    expect(selectWorkspaceBrand(null, null, remembered).style).toBe("solid");
  });

  it("shows an unsaved preview over the remembered brand", () => {
    const remembered = parseRememberedBrand(cookie, "ws-1");
    const brand = selectWorkspaceBrand(
      null,
      { primaryColor: "#DC2626", brandStyle: "gradient" },
      remembered,
    );
    expect(brand.primary).toBe("#DC2626");
    expect(brand.style).toBe("gradient");
  });
});
