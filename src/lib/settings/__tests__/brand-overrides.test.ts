import { describe, expect, it } from "vitest";

import {
  resolveWorkspaceBrand,
  workspaceBrandCssVars,
} from "@/lib/settings/brand";

const saved = {
  workspaceId: "ws-1",
  primaryColor: "#2563EB",
  secondaryColor: "#0F172A",
  catalog: {
    "organization/branding": {
      primaryColor: "#2563EB",
      secondaryColor: "#0F172A",
      brandStyle: "gradient",
    },
  },
};

describe("resolveWorkspaceBrand", () => {
  it("uses the saved branding", () => {
    const brand = resolveWorkspaceBrand(saved);
    expect(brand.primary).toBe("#2563EB");
    expect(brand.style).toBe("gradient");
  });

  it("shows an unsaved preview over the saved branding page", () => {
    const brand = resolveWorkspaceBrand(saved, {
      primary: "#DC2626",
      style: "solid",
    });
    expect(brand.primary).toBe("#DC2626");
    expect(brand.secondary).toBe("#0F172A");
    expect(brand.style).toBe("solid");
  });

  it("drops the button gradient and fills surfaces with secondary when solid", () => {
    const vars = workspaceBrandCssVars(
      resolveWorkspaceBrand(saved, { style: "solid" }),
    ) as Record<string, string>;
    expect(vars["--brand-gradient"]).toBe("none");
    expect(vars["--brand-surface"]).toBe("linear-gradient(#0F172A, #0F172A)");
  });
});
