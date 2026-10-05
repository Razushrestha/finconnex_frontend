import { describe, expect, it } from "vitest";
import {
  PHONE_COUNTRIES,
  phoneCountryForCode,
  searchPhoneCountries,
} from "@/lib/phone/countries";

describe("phone countries", () => {
  it("lists every country once, with a name, flag and calling code", () => {
    expect(PHONE_COUNTRIES.length).toBeGreaterThan(230);
    expect(new Set(PHONE_COUNTRIES.map((c) => c.iso)).size).toBe(PHONE_COUNTRIES.length);
    for (const c of PHONE_COUNTRIES) {
      expect(c.code).toMatch(/^\+\d{1,4}$/);
      expect(c.name.length).toBeGreaterThan(1);
    }
    expect(PHONE_COUNTRIES.find((c) => c.iso === "NP")?.name).toBe("Nepal");
  });

  it("searches by name, ISO and calling code", () => {
    expect(searchPhoneCountries("nep")[0].iso).toBe("NP");
    expect(searchPhoneCountries("au")[0].iso).toBe("AU");
    expect(searchPhoneCountries("+977")[0].iso).toBe("NP");
    expect(searchPhoneCountries("61").map((c) => c.iso)).toContain("AU");
    const plusOne = searchPhoneCountries("1").map((c) => c.iso);
    expect(plusOne).toEqual(expect.arrayContaining(["US", "CA"]));
    expect(plusOne[0]).toBe("US");
    expect(searchPhoneCountries("zzzz")).toEqual([]);
  });

  it("maps a shared code to its main country", () => {
    expect(phoneCountryForCode("+1")?.iso).toBe("US");
    expect(phoneCountryForCode("+44")?.iso).toBe("GB");
    expect(phoneCountryForCode("+7")?.iso).toBe("RU");
    expect(phoneCountryForCode("+977")?.iso).toBe("NP");
  });
});
