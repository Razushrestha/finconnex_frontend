import { afterEach, describe, expect, it, vi } from "vitest";

import { parseAppointmentStart, toLocalStart } from "@/lib/booking/dashboard";

describe("appointment start times", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("converts an instant with a zone to the browser's clock", () => {
    const utc = "2026-10-05T22:00:00.000Z";
    expect(parseAppointmentStart(utc).getTime()).toBe(Date.parse(utc));
    const offset = "2026-10-06T09:00:00+11:00";
    expect(parseAppointmentStart(offset).getTime()).toBe(Date.parse(offset));
  });

  it("keeps a zone-less wall-clock time as written", () => {
    const local = parseAppointmentStart("2026-10-06T09:00");
    expect([local.getFullYear(), local.getMonth(), local.getDate(), local.getHours()]).toEqual([
      2026, 9, 6, 9,
    ]);
  });

  it("formats a UTC booking in local time, not as the raw UTC digits", () => {
    const utc = "2026-10-05T22:00:00.000Z";
    const d = new Date(utc);
    const pad = (n: number) => String(n).padStart(2, "0");
    expect(toLocalStart(utc)).toBe(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    );
  });
});
