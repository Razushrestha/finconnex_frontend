import { describe, expect, it } from "vitest";
import { brandSocialLinks, socialUrl } from "@/components/booking/BrandSocialLinks";
import { defaultBookingPageBranding } from "@/lib/booking/page-branding";

describe("socialUrl", () => {
  it("turns handles into profile links", () => {
    expect(socialUrl("facebook", "acme")).toBe("https://www.facebook.com/acme");
    expect(socialUrl("instagram", "@acme.co")).toBe("https://www.instagram.com/acme.co");
    expect(socialUrl("x", "@acme")).toBe("https://x.com/acme");
    expect(socialUrl("linkedin", "jane-doe")).toBe("https://www.linkedin.com/in/jane-doe");
    expect(socialUrl("linkedin", "company/acme")).toBe("https://www.linkedin.com/company/acme");
  });

  it("keeps full URLs and completes bare domains", () => {
    expect(socialUrl("facebook", "https://fb.com/acme")).toBe("https://fb.com/acme");
    expect(socialUrl("instagram", "instagram.com/acme")).toBe("https://instagram.com/acme");
    expect(socialUrl("x", "  ")).toBe("");
  });
});

describe("brandSocialLinks", () => {
  it("lists only filled-in, visible profiles", () => {
    const branding = defaultBookingPageBranding();
    branding.footer = {
      ...branding.footer,
      facebook: "acme",
      facebookVisible: true,
      instagram: "acme",
      instagramVisible: false,
      x: "",
      xVisible: true,
    };
    expect(brandSocialLinks(branding).map((link) => link.label)).toEqual(["Facebook"]);
  });
});
