import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OfflineLocationFields,
  addressFromPosition,
  initialOfflineLocation,
  resolveOfflineAddress,
  savedOfflineAddress,
  type OfflineKind,
} from "@/components/booking/OfflineLocationFields";

const OFFICE = "Level 12, 100 Pitt Street, Sydney NSW 2000";

function render(overrides: {
  kind?: OfflineKind;
  address?: string;
  invalid?: boolean;
}) {
  return renderToStaticMarkup(
    createElement(OfflineLocationFields, {
      kind: overrides.kind ?? "office",
      onKindChange: () => {},
      officeAddress: OFFICE,
      address: overrides.address ?? "",
      onAddressChange: () => {},
      invalid: overrides.invalid,
    }),
  );
}

describe("savedOfflineAddress", () => {
  it("reads the address the wizard saved in meetingViaDetail", () => {
    expect(
      savedOfflineAddress({
        meetingVia: "in_person",
        meetingViaDetail: "5 King St, Perth WA 6000",
      }),
    ).toBe("5 King St, Perth WA 6000");
  });

  it("falls back to the CRM location", () => {
    expect(
      savedOfflineAddress({ meetingVia: "in_person", location: "9 Hay St" }),
    ).toBe("9 Hay St");
  });

  it("ignores the placeholder labels that mean no address was entered", () => {
    expect(
      savedOfflineAddress({
        meetingVia: "in_person",
        meetingViaDetail: "Office address",
        location: "In person",
      }),
    ).toBe("");
  });

  it("is empty for online and phone event types", () => {
    expect(
      savedOfflineAddress({ meetingVia: "video", meetingViaDetail: "Zoom" }),
    ).toBe("");
    expect(
      savedOfflineAddress({ meetingVia: "phone", location: "Phone" }),
    ).toBe("");
    expect(savedOfflineAddress({})).toBe("");
  });
});

describe("initialOfflineLocation", () => {
  it("starts on the office address when nothing else was saved", () => {
    expect(initialOfflineLocation("", OFFICE)).toEqual({
      kind: "office",
      custom: "",
    });
  });

  it("stays on the office address when that is what was saved", () => {
    expect(initialOfflineLocation(`  ${OFFICE} `, OFFICE)).toEqual({
      kind: "office",
      custom: "",
    });
  });

  it("opens Custom with the saved address when it is a different one", () => {
    expect(initialOfflineLocation("5 King St, Perth WA 6000", OFFICE)).toEqual({
      kind: "custom",
      custom: "5 King St, Perth WA 6000",
    });
  });
});

describe("resolveOfflineAddress", () => {
  it("uses the office address for Office address, ignoring typed text", () => {
    expect(resolveOfflineAddress("office", OFFICE, "something else")).toBe(OFFICE);
  });

  it("uses the trimmed typed address for Custom", () => {
    expect(resolveOfflineAddress("custom", OFFICE, "  9 Hay St  ")).toBe("9 Hay St");
  });

  it("is empty when Custom has nothing typed, so the form can ask for it", () => {
    expect(resolveOfflineAddress("custom", OFFICE, "   ")).toBe("");
  });
});

describe("OfflineLocationFields markup", () => {
  it("offers Office address and Custom in the dropdown", () => {
    const html = render({});
    expect(html).toContain('aria-label="Location"');
    expect(html).toContain(">Office address</option>");
    expect(html).toContain(">Custom</option>");
  });

  it("shows the office address read-only with a pin, and no typing box", () => {
    const html = render({ kind: "office" });
    expect(html).toContain('aria-label="Office address"');
    expect(html).toContain(`value="${OFFICE}"`);
    expect(html).toMatch(/readOnly=""|readonly=""/i);
    expect(html).toContain("lucide-map-pin");
    expect(html).not.toContain('aria-label="Custom address"');
    expect(html).not.toContain("Use current location");
  });

  it("selects the matching option for the current kind", () => {
    expect(render({ kind: "office" })).toMatch(
      /<option value="office" selected=""|<option selected="" value="office"/,
    );
    expect(render({ kind: "custom" })).toMatch(
      /<option value="custom" selected=""|<option selected="" value="custom"/,
    );
  });

  it("lets a custom address be typed and offers the current location", () => {
    const html = render({ kind: "custom", address: "9 Hay St" });
    expect(html).toContain('aria-label="Custom address"');
    expect(html).toContain('value="9 Hay St"');
    expect(html).toContain('placeholder="Search or enter an address"');
    expect(html).toContain("Use current location");
    expect(html).not.toContain('aria-label="Office address"');
  });

  it("flags an empty custom address, with a message right under the field", () => {
    const invalid = render({ kind: "custom", invalid: true });
    expect(invalid).toContain('aria-invalid="true"');
    expect(invalid).toContain('role="alert"');
    expect(invalid).toContain("Enter an address or use your current location.");

    const valid = render({ kind: "custom" });
    expect(valid).not.toContain("aria-invalid");
    expect(valid).not.toContain('role="alert"');
  });

  it("puts the dropdown beside the toggle and the address on its own full-width line", () => {
    const html = render({ kind: "office" });
    // The dropdown grows to fill the toggle's row; the address block wraps below it.
    expect(html).toMatch(/<select[^>]*class="[^"]*\bflex-1\b/);
    expect(html).toMatch(/<div class="w-full space-y-2">/);
  });
});

describe("addressFromPosition", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the street address the lookup finds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ display_name: "100 Pitt St, Sydney NSW 2000" }),
      })),
    );
    await expect(addressFromPosition(-33.8688, 151.2093)).resolves.toBe(
      "100 Pitt St, Sydney NSW 2000",
    );
  });

  it("falls back to the coordinates when the lookup fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    await expect(addressFromPosition(-33.8688, 151.2093)).resolves.toBe(
      "-33.86880, 151.20930",
    );
  });

  it("falls back to the coordinates on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );
    await expect(addressFromPosition(1, 2)).resolves.toBe("1.00000, 2.00000");
  });
});
