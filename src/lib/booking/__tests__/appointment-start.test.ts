import { afterEach, describe, expect, it, vi } from "vitest";

import {
  appointmentsFromGuestClocks,
  parseAppointmentStart,
  toLocalStart,
} from "@/lib/booking/dashboard";

describe("appointment start times", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("converts an instant with a zone to the browser's clock", () => {
    const utc = "2026-10-05T22:00:00.000Z";
    expect(parseAppointmentStart(utc).getTime()).toBe(Date.parse(utc));
    const offset = "2026-10-06T09:00:00+11:00";
    expect(parseAppointmentStart(offset).getTime()).toBe(Date.parse(offset));
  });

  it("keeps afternoon times when the locale string says pm", () => {
    const parsed = parseAppointmentStart("09/10/2026, 03:55 pm");
    expect(parsed.getHours()).toBe(15);
    expect(parsed.getMinutes()).toBe(55);
    expect(parsed.getDate()).toBe(9);
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

  it("builds the dashboard row from the saved appointment when the CRM is down", () => {
    const [row] = appointmentsFromGuestClocks([
      {
        meetingId: "eec04390-1260-4580-be45-0c013451923a",
        title: "10/7/2026 Test",
        guestName: "Raju shrestha",
        hostName: "nepatronix web",
        reference: "AP-62859",
        dateIso: "2026-10-15",
        startHHmm: "14:00",
        durationMinutes: 90,
        updatedAt: "2026-10-07T05:53:08.887Z",
        status: "scheduled",
      },
    ]);
    expect(row.id).toBe("eec04390-1260-4580-be45-0c013451923a");
    expect(row.guestName).toBe("Raju shrestha");
    expect(row.start).toBe("2026-10-15T14:00");
    expect(row.end).toBe("2026-10-15T15:30");
    expect(row.bookingCode).toBe("AP-62859");
    expect(
      appointmentsFromGuestClocks([
        {
          title: "Removed",
          dateIso: "2026-10-15",
          startHHmm: "14:00",
          durationMinutes: 90,
          updatedAt: "2026-10-07T05:53:08.887Z",
          status: "deleted",
        },
      ]),
    ).toEqual([]);
  });
});
