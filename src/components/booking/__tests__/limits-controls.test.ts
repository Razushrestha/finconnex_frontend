import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DateRangeField,
  ListboxSelect,
  SlotLimitField,
  describeSlotLimit,
  formatLimitRange,
  normalizeSlotLimit,
  rangeDayCount,
  slotLimitCount,
  slotLimitMode,
  slotLimitNeedsNumber,
} from "@/components/booking/LimitsControls";

describe("slot limit values", () => {
  it("reads the stored string as a mode", () => {
    expect(slotLimitMode("No limit")).toBe("none");
    expect(slotLimitMode("5")).toBe("perDay");
    expect(slotLimitMode("Per day")).toBe("perDay");
    expect(slotLimitMode("One active appointment")).toBe("oneActive");
    expect(slotLimitMode("")).toBe("none");
    expect(slotLimitMode("0")).toBe("none");
  });

  it("only treats a real positive number as a daily cap", () => {
    expect(slotLimitCount("5")).toBe(5);
    expect(slotLimitCount("Per day")).toBeNull();
    expect(slotLimitCount("No limit")).toBeNull();
    expect(slotLimitCount("0")).toBeNull();
  });

  it("flags a Per day that has no number yet and never saves it as a limit", () => {
    expect(slotLimitNeedsNumber("Per day")).toBe(true);
    expect(slotLimitNeedsNumber("5")).toBe(false);
    expect(slotLimitNeedsNumber("No limit")).toBe(false);
    expect(normalizeSlotLimit("Per day")).toBe("No limit");
    expect(normalizeSlotLimit("5")).toBe("5");
    expect(normalizeSlotLimit("One active appointment")).toBe(
      "One active appointment",
    );
  });

  it("describes limits for the saved list", () => {
    expect(describeSlotLimit("No limit")).toBe("No limit");
    expect(describeSlotLimit("3")).toBe("3 per day");
    expect(describeSlotLimit("Per day")).toBe("No limit");
    expect(describeSlotLimit("One active appointment")).toBe(
      "One active appointment",
    );
  });

  it("formats and counts date ranges", () => {
    expect(formatLimitRange("2026-10-02", "2026-10-02")).toBe("Oct 2, 2026");
    expect(formatLimitRange("2026-10-02", "2026-10-05")).toBe(
      "Oct 2, 2026 – Oct 5, 2026",
    );
    expect(rangeDayCount("2026-10-02", "2026-10-05")).toBe(4);
    expect(rangeDayCount("2026-10-05", "2026-10-02")).toBe(0);
  });
});

describe("limit controls markup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 2, 12, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the Slots per Event Type dropdown closed with its value", () => {
    const html = renderToStaticMarkup(
      createElement(SlotLimitField, {
        kind: "event",
        label: "Slots per Event Type",
        value: "No limit",
        onChange: () => undefined,
      }),
    );
    expect(html).toContain("No limit");
    expect(html).toContain('aria-expanded="false"');
    // The number box only appears once "Per day" is chosen.
    expect(html).not.toContain("<input");
  });

  it("joins an empty number box to the Per day dropdown when Per day is chosen", () => {
    const html = renderToStaticMarkup(
      createElement(SlotLimitField, {
        kind: "event",
        label: "Slots per Event Type",
        value: "Per day",
        onChange: () => undefined,
      }),
    );
    expect(html).toContain('placeholder="Enter number"');
    expect(html).toContain('value=""');
    expect(html).toContain("Per day");
    // Number box first, dropdown second, in one row.
    expect(html.indexOf("<input")).toBeLessThan(html.indexOf('role="combobox"'));
    expect(html).toContain("rounded-l-lg");
    expect(html).toContain("rounded-r-lg");
  });

  it("keeps every slot-limit layout compact instead of full width", () => {
    for (const value of ["No limit", "One active appointment", "Per day", "4"]) {
      const html = renderToStaticMarkup(
        createElement(SlotLimitField, {
          kind: "customer",
          label: "Slots per Customer",
          value,
          onChange: () => undefined,
        }),
      );
      // Same cap in every mode, so the field never jumps size when switching.
      expect(html).toContain("max-w-[280px]");
    }
  });

  it("shows the typed number for a stored per-day cap", () => {
    const html = renderToStaticMarkup(
      createElement(SlotLimitField, {
        kind: "customer",
        label: "Slots per Customer",
        value: "4",
        onChange: () => undefined,
      }),
    );
    expect(html).toContain("Per day");
    expect(html).toContain('value="4"');
    expect(html).toContain('inputMode="numeric"');
  });

  it("shows One active appointment as a single dropdown with a dark outline", () => {
    const html = renderToStaticMarkup(
      createElement(SlotLimitField, {
        kind: "customer",
        label: "Slots per Customer",
        value: "One active appointment",
        onChange: () => undefined,
      }),
    );
    expect(html).toContain("One active appointment");
    // No number box, one compact dropdown, closed, with the dark slate border.
    expect(html).not.toContain("<input");
    expect(html.match(/role="combobox"/g)).toHaveLength(1);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("border-[#475569]");
    expect(html).toContain("rounded-lg");
    expect(html).not.toContain("rounded-r-lg");
  });

  it("keeps the light outline for the default No limit", () => {
    const html = renderToStaticMarkup(
      createElement(SlotLimitField, {
        kind: "customer",
        label: "Slots per Customer",
        value: "No limit",
        onChange: () => undefined,
      }),
    );
    expect(html).toContain("border-[#E5E7EB]");
    expect(html).not.toContain("border-[#475569] hover");
  });

  it("renders a plain listbox trigger", () => {
    const html = renderToStaticMarkup(
      createElement(ListboxSelect, {
        label: "User",
        value: "b",
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
        onChange: () => undefined,
      }),
    );
    expect(html).toContain("Beta");
    expect(html).not.toContain("Alpha");
  });

  it("shows the placeholder and no calendar while closed", () => {
    const html = renderToStaticMarkup(
      createElement(DateRangeField, {
        start: "",
        end: "",
        open: false,
        onOpenChange: () => undefined,
        onChange: () => undefined,
      }),
    );
    expect(html).toContain("Select Date Range");
    expect(html).not.toContain('role="dialog"');
  });

  it("opens a two-month, Monday-first calendar with the today marker", () => {
    const html = renderToStaticMarkup(
      createElement(DateRangeField, {
        start: "",
        end: "",
        open: true,
        onOpenChange: () => undefined,
        onChange: () => undefined,
      }),
    );
    expect(html).toContain("Oct 2026");
    expect(html).toContain("Nov 2026");

    const headers = [
      ...html.matchAll(/<th[^>]*scope="col"[^>]*>([^<]*)<\/th>/g),
    ].map((match) => match[1]);
    expect(headers.slice(0, 7)).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    expect(headers).toHaveLength(14);

    // Today (Oct 2) is outlined in purple with the small triangle under the number.
    expect(html).toContain('data-today="true"');
    expect(html).toContain("border-bottom:4px solid var(--brand-primary)");
  });

  it("highlights every day in the chosen range", () => {
    const html = renderToStaticMarkup(
      createElement(DateRangeField, {
        start: "2026-10-05",
        end: "2026-10-08",
        open: true,
        onOpenChange: () => undefined,
        onChange: () => undefined,
      }),
    );
    expect(html).toContain("Oct 5, 2026 – Oct 8, 2026");
    expect(html.match(/data-selected="true"/g)).toHaveLength(4);
  });
});
