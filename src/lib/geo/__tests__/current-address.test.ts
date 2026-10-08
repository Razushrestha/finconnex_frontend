import { describe, expect, it } from "vitest";
import { formatNominatimAddress } from "@/lib/geo/current-address";

describe("formatNominatimAddress", () => {
  it("builds a postal-style address from the parts", () => {
    expect(
      formatNominatimAddress({
        name: "Pitt Street",
        display_name: "100, Pitt Street, Sydney, Council of the City of Sydney, New South Wales, 2000, Australia",
        address: {
          house_number: "100",
          road: "Pitt Street",
          suburb: "Sydney",
          city: "Council of the City of Sydney",
          state: "New South Wales",
          postcode: "2000",
          country: "Australia",
        },
      }),
    ).toBe("100 Pitt Street, Sydney, New South Wales 2000, Australia");
  });

  it("leads with a named place such as a building", () => {
    expect(
      formatNominatimAddress({
        name: "Acme House",
        address: { road: "George Street", city: "Brisbane", state: "Queensland", country: "Australia" },
      }),
    ).toBe("Acme House, George Street, Brisbane, Queensland, Australia");
  });

  it("falls back to the full place name when parts are missing", () => {
    expect(formatNominatimAddress({ display_name: "Somewhere remote", address: {} })).toBe(
      "Somewhere remote",
    );
  });
});
