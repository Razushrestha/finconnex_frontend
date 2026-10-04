import { describe, expect, it, vi } from "vitest";
import { normalizeBookingPageBranding } from "@/lib/booking/page-branding";

describe("normalizeBookingPageBranding", () => {
  it("defaults to basic purple branding", () => {
    const branding = normalizeBookingPageBranding(null);
    expect(branding.layout).toBe("basic");
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

describe("per-consultation theme cache", () => {
  it("keeps one consultation's cached theme from applying to another", async () => {
    // Tests run in Node; give the cache a browser-like store.
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
    const { readLocalBookingPageBranding, writeLocalBookingPageBranding, normalizeBookingPageBranding } =
      await import("@/lib/booking/page-branding");
    writeLocalBookingPageBranding("consult-a", normalizeBookingPageBranding({ layout: "fresh" }));

    expect(readLocalBookingPageBranding("consult-a").layout).toBe("fresh");
    expect(readLocalBookingPageBranding("consult-b").layout).toBe("basic");
    vi.unstubAllGlobals();
  });
});
