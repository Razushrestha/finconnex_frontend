import { describe, expect, it } from "vitest";
import { normalizeBookingPageBranding } from "@/lib/booking/page-branding";

describe("normalizeBookingPageBranding", () => {
  it("defaults to compact purple branding", () => {
    const branding = normalizeBookingPageBranding(null);
    expect(branding.layout).toBe("compact");
    expect(branding.primaryColor).toBe("#5A32A3");
    expect(branding.header.titleVisible).toBe(true);
    expect(branding.showBanner).toBe(true);
    expect(branding.showUserAsCards).toBe(false);
    expect(branding.buttonText).toBe("Book Appointment");
  });

  it("keeps show-user-as-cards when it was saved on", () => {
    expect(
      normalizeBookingPageBranding({ showUserAsCards: true }).showUserAsCards,
    ).toBe(true);
  });

  it("keeps a saved book-button label", () => {
    expect(
      normalizeBookingPageBranding({ buttonText: "Reserve now" }).buttonText,
    ).toBe("Reserve now");
  });

  it("keeps a saved header title", () => {
    expect(
      normalizeBookingPageBranding({
        header: { title: "Nepatronix", titleVisible: true },
      }).header.title,
    ).toBe("Nepatronix");
  });
});
