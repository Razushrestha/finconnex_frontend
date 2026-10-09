import { describe, expect, it } from "vitest";
import type { BookingPage } from "@/lib/booking/types";
import {
  amountToBePaid,
  appointmentProblem,
  chooseHost,
  composeInternalNotes,
  customersFromBookings,
  defaultPaidAmount,
  describeSlot,
  eventTypeInitials,
  eventTypeTileColor,
  expandOfferedSlots,
  filterCustomers,
  formatAppointmentAmount,
  groupSlotsByDay,
  hasPrice,
  INTERNAL_NOTES_LIMIT,
  localPageSlots,
  subtractBusySlots,
  matchesKeywords,
  monthBounds,
  monthGrid,
  monthLabel,
  parsePaidAmount,
  paymentNote,
  shiftMonth,
  zonedDateKey,
  zonedTimeLabel,
} from "@/lib/booking/new-appointment";

describe("event type row", () => {
  it("writes the price the way the list shows it", () => {
    expect(formatAppointmentAmount(1000, "NPR")).toBe("Rs1000");
    expect(formatAppointmentAmount(100000, "NPR")).toBe("Rs100000");
    expect(formatAppointmentAmount(10.5, "NPR")).toBe("Rs10.50");
    expect(formatAppointmentAmount(25, "AUD")).toBe("A$25");
    expect(formatAppointmentAmount(Number.NaN, "NPR")).toBe("Rs0");
  });

  it("only treats a positive number as a price", () => {
    expect(hasPrice(1000)).toBe(true);
    expect(hasPrice(0)).toBe(false);
    expect(hasPrice(undefined)).toBe(false);
    expect(hasPrice(Number.NaN)).toBe(false);
    expect(hasPrice(-5)).toBe(false);
  });

  it("makes initials from the first two words, or the first two letters", () => {
    expect(eventTypeInitials("new test 12:40")).toBe("NT");
    expect(eventTypeInitials("test5")).toBe("TE");
    expect(eventTypeInitials("  Free   Finance Consultation ")).toBe("FF");
    expect(eventTypeInitials("")).toBe("ET");
  });

  it("gives an event type the same colour every time", () => {
    const first = eventTypeTileColor("a1b2");
    expect(eventTypeTileColor("a1b2")).toBe(first);
    expect(first).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("searches names case-insensitively and lets an empty search through", () => {
    expect(matchesKeywords("New Test 12:40", "test")).toBe(true);
    expect(matchesKeywords("New Test 12:40", "TEST5")).toBe(false);
    expect(matchesKeywords("anything", "   ")).toBe(true);
  });
});

describe("slots grouped by day", () => {
  it("merges the same instant across hosts and remembers who is free", () => {
    const days = groupSlotsByDay(
      [
        { startTime: "2026-10-05T04:30:00.000Z", hostId: "h2" },
        { startTime: "2026-10-05T04:30:00.000Z", hostId: "h1" },
        { startTime: "2026-10-05T04:30:00.000Z", hostId: "h1" },
        { startTime: "2026-10-05T05:00:00.000Z", hostId: "h1" },
      ],
      "UTC",
    );
    const monday = days.get("2026-10-05")!;
    expect(monday).toHaveLength(2);
    expect(monday[0]!.hostIds).toEqual(["h2", "h1"]);
    expect(monday[1]!.hostIds).toEqual(["h1"]);
  });

  it("puts a slot on the day it falls on in the event type's timezone", () => {
    // 20:00 UTC on 2 Oct is already 3 Oct 01:45 in Kathmandu (UTC+5:45).
    const days = groupSlotsByDay(
      [{ startTime: "2026-10-02T20:00:00.000Z", hostId: "h1" }],
      "Asia/Kathmandu",
    );
    expect([...days.keys()]).toEqual(["2026-10-03"]);
    expect(days.get("2026-10-03")![0]!.label).toBe("1:45 AM");
    expect(zonedDateKey("2026-10-02T20:00:00.000Z", "UTC")).toBe("2026-10-02");
    expect(zonedTimeLabel("2026-10-02T20:00:00.000Z", "UTC")).toBe("8:00 PM");
  });

  it("sorts each day by time and skips junk", () => {
    const days = groupSlotsByDay(
      [
        { startTime: "2026-10-05T06:00:00.000Z" },
        { startTime: "not a date" },
        { startTime: "2026-10-05T01:00:00.000Z" },
      ],
      "UTC",
    );
    expect(days.get("2026-10-05")!.map((slot) => slot.label)).toEqual(["1:00 AM", "6:00 AM"]);
    expect(days.get("2026-10-05")![0]!.hostIds).toEqual([]);
  });

  it("does not throw on an unknown timezone", () => {
    expect(zonedDateKey("2026-10-05T01:00:00.000Z", "Not/AZone")).toBe("2026-10-05");
  });

  it("writes the chosen time out, naming the zone only when it is not the viewer's", () => {
    expect(describeSlot("2026-10-03T04:15:00.000Z", "UTC", "UTC")).toBe("Sat, Oct 3, 2026 · 4:15 AM");
    // Sydney's clocks only go forward on Sunday 4 Oct 2026, so it is still UTC+10 here.
    expect(describeSlot("2026-10-03T04:15:00.000Z", "Australia/Sydney", "Asia/Kathmandu")).toBe(
      "Sat, Oct 3, 2026 · 2:15 PM (Australia/Sydney)",
    );
    expect(describeSlot("garbage", "UTC")).toBe("");
  });

  it("does not name the timezone when the viewer's zone is the same place under another name", () => {
    // Browsers report Kathmandu as "Asia/Katmandu"; the event is stored as "Asia/Kathmandu".
    expect(describeSlot("2026-10-05T03:45:00.000Z", "Asia/Kathmandu", "Asia/Katmandu")).toBe(
      "Mon, Oct 5, 2026 · 9:30 AM",
    );
    // A neighbouring zone (Kolkata is 15 minutes behind Kathmandu) reads differently, so it is still named.
    expect(describeSlot("2026-10-05T03:45:00.000Z", "Asia/Kathmandu", "Asia/Kolkata")).toBe(
      "Mon, Oct 5, 2026 · 9:30 AM (Asia/Kathmandu)",
    );
  });
});

describe("a consultation that only exists in this browser", () => {
  const page = {
    availability: [
      { day: "Monday", enabled: true, start: "09:00", end: "11:00" },
      { day: "Tuesday", enabled: false, start: "09:00", end: "17:00" },
    ],
    durationMinutes: 30,
  } as unknown as BookingPage;

  it("offers its own weekly hours on the days that are switched on", () => {
    // 5 Oct 2026 is a Monday; 6 Oct a Tuesday.
    const days = localPageSlots(page, 2026, 9, "UTC", new Date("2026-10-01T00:00:00Z"));
    expect(days.get("2026-10-05")!.map((slot) => slot.label)).toEqual([
      "9:00 AM",
      "9:30 AM",
      "10:00 AM",
      "10:30 AM",
    ]);
    expect(days.has("2026-10-06")).toBe(false);
  });

  it("leaves out times that have already passed", () => {
    const days = localPageSlots(page, 2026, 9, "UTC", new Date("2026-10-05T09:45:00Z"));
    expect(days.get("2026-10-05")!.map((slot) => slot.label)).toEqual(["10:00 AM", "10:30 AM"]);
  });
});

describe("CRM days that only listed the first start", () => {
  const hoursPage = {
    availability: [
      { day: "Monday", enabled: true, start: "09:00", end: "17:00" },
    ],
    durationMinutes: 90,
  } as unknown as BookingPage;

  it("fills the rest of the working hours", () => {
    const hours = localPageSlots(hoursPage, 2026, 9, "UTC", new Date("2026-10-01T00:00:00Z"));
    const offered = groupSlotsByDay(
      [{ startTime: "2026-10-05T09:00:00.000Z", hostId: "h1" }],
      "UTC",
    );
    const days = expandOfferedSlots({
      offered,
      hours,
      hostIds: ["h1"],
    });
    expect(days.get("2026-10-05")!.map((slot) => slot.label)).toEqual([
      "9:00 AM",
      "10:30 AM",
      "12:00 PM",
      "1:30 PM",
      "3:00 PM",
    ]);
    expect(days.get("2026-10-05")![0]!.hostIds).toEqual(["h1"]);
    expect(days.get("2026-10-05")![1]!.fromHours).toBe(true);
    expect(days.get("2026-10-05")![1]!.hostIds).toEqual(["h1"]);
  });

  it("keeps a complete CRM day instead of replacing it", () => {
    const hours = localPageSlots(hoursPage, 2026, 9, "UTC", new Date("2026-10-01T00:00:00Z"));
    const offered = hours;
    const days = expandOfferedSlots({ offered, hours, hostIds: ["h1"] });
    expect(days.get("2026-10-05")).toEqual(hours.get("2026-10-05"));
  });

  it("hides a start that already has an open booking", () => {
    const hours = localPageSlots(hoursPage, 2026, 9, "UTC", new Date("2026-10-01T00:00:00Z"));
    const days = subtractBusySlots(hours, [
      {
        startTime: "2026-10-05T10:30:00.000Z",
        endTime: "2026-10-05T12:00:00.000Z",
        eventTypeId: "et-1",
        status: "CONFIRMED",
      },
      {
        startTime: "2026-10-05T12:00:00.000Z",
        endTime: "2026-10-05T13:30:00.000Z",
        eventTypeId: "et-1",
        status: "CANCELLED",
      },
    ], {
      eventTypeId: "et-1",
      durationMinutes: 90,
    });
    expect(days.get("2026-10-05")!.map((slot) => slot.label)).toEqual([
      "9:00 AM",
      "12:00 PM",
      "1:30 PM",
      "3:00 PM",
    ]);
  });
});

describe("Random User", () => {
  it("picks one of the free hosts", () => {
    expect(chooseHost(["a", "b", "c"], "random", () => 0)).toBe("a");
    expect(chooseHost(["a", "b", "c"], "random", () => 0.5)).toBe("b");
    expect(chooseHost(["a", "b", "c"], "random", () => 0.999999)).toBe("c");
    expect(chooseHost(["a", "b", "c"], "random", () => 1)).toBe("c");
  });

  it("has nobody to pick when no host is free", () => {
    expect(chooseHost([], "random")).toBeUndefined();
  });

  it("keeps a named user only if that user is free at the time", () => {
    expect(chooseHost(["a", "b"], "b")).toBe("b");
    expect(chooseHost(["a"], "b")).toBeUndefined();
  });
});

describe("month calendar", () => {
  it("lays out October 2026 Monday-first", () => {
    const cells = monthGrid(2026, 9);
    expect(cells.length % 7).toBe(0);
    // 1 Oct 2026 is a Thursday: Mon, Tue, Wed are padding.
    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]).toEqual({ iso: "2026-10-01", day: 1 });
    // 3 Oct is the Saturday in the first row.
    expect(cells[5]).toEqual({ iso: "2026-10-03", day: 3 });
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(cells.filter(Boolean).at(-1)).toEqual({ iso: "2026-10-31", day: 31 });
  });

  it("starts a Monday month with no padding", () => {
    // 1 June 2026 is a Monday.
    expect(monthGrid(2026, 5)[0]).toEqual({ iso: "2026-06-01", day: 1 });
  });

  it("knows the window to ask the CRM for", () => {
    expect(monthBounds(2026, 9)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(monthBounds(2028, 1)).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("labels and shifts months across year ends", () => {
    expect(monthLabel(2026, 9)).toBe("Oct 2026");
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month0: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month0: 11 });
    expect(shiftMonth(2026, 9, 0)).toEqual({ year: 2026, month0: 9 });
  });
});

describe("payment", () => {
  it("shows what is still to be paid", () => {
    expect(amountToBePaid(1000, 1000)).toBe(0);
    expect(amountToBePaid(1000, 0)).toBe(1000);
    expect(amountToBePaid(1000, 250.5)).toBe(749.5);
  });

  it("never goes negative when more than the price is typed", () => {
    expect(amountToBePaid(1000, 5000)).toBe(0);
    expect(amountToBePaid(1000, -20)).toBe(1000);
    expect(amountToBePaid(1000, Number.NaN)).toBe(1000);
  });

  it("starts the amount at the full price for Paid and zero for Due", () => {
    expect(defaultPaidAmount("Paid", 1000)).toBe(1000);
    expect(defaultPaidAmount("Due", 1000)).toBe(0);
  });

  it("reads the typed amount, treating junk as zero", () => {
    expect(parsePaidAmount("1000")).toBe(1000);
    expect(parsePaidAmount("1,250.75")).toBe(1250.75);
    expect(parsePaidAmount("")).toBe(0);
    expect(parsePaidAmount("abc")).toBe(0);
    expect(parsePaidAmount("-4")).toBe(0);
  });

  it("writes the outcome as a note line", () => {
    expect(paymentNote({ status: "Paid", price: 1000, paid: 1000, currency: "NPR" })).toBe(
      "Payment: Paid - Rs1000 of Rs1000 received",
    );
    expect(paymentNote({ status: "Due", price: 1000, paid: 0, currency: "NPR" })).toBe(
      "Payment: Due - Rs0 of Rs1000 received, Rs1000 to be paid",
    );
  });
});

describe("internal notes", () => {
  it("puts the payment line under the typed notes", () => {
    expect(composeInternalNotes("  Bring ID ", "Payment: Paid - Rs1000 of Rs1000 received")).toBe(
      "Bring ID\n\nPayment: Paid - Rs1000 of Rs1000 received",
    );
  });

  it("is empty when there is nothing to say", () => {
    expect(composeInternalNotes("   ")).toBe("");
    expect(composeInternalNotes("", "  ")).toBe("");
  });

  it("stays within what the backend accepts", () => {
    expect(composeInternalNotes("x".repeat(INTERNAL_NOTES_LIMIT + 50), "p")).toHaveLength(
      INTERNAL_NOTES_LIMIT,
    );
  });
});

describe("customers", () => {
  const row = (
    id: string,
    guestName: string,
    guestEmail: string,
    startTime: string,
    extra: Record<string, unknown> = {},
  ) => ({ id, guestName, guestEmail, startTime, ...extra });

  it("lists each person who has booked once, newest booking first", () => {
    const list = customersFromBookings([
      row("1", "Raju shrestha", "raju@example.com", "2026-09-01T01:00:00.000Z"),
      row("2", "Raju S", "RAJU@example.com", "2026-10-01T01:00:00.000Z", { contactId: "c-1" }),
      row("3", "Mohit", "mohit@example.com", "2026-09-15T01:00:00.000Z"),
    ]);
    expect(list.map((c) => c.name)).toEqual(["Raju S", "Mohit"]);
    expect(list[0]).toMatchObject({ email: "RAJU@example.com", contactId: "c-1", source: "Bookings" });
  });

  it("does not list the placeholder Guest that has no email", () => {
    const list = customersFromBookings([
      row("1", "Guest", "", "2026-10-01T01:00:00.000Z"),
      row("2", "Raju shrestha", "raju@example.com", "2026-09-01T01:00:00.000Z"),
      row("3", "guest", "  ", "2026-08-01T01:00:00.000Z"),
    ]);
    expect(list.map((c) => c.name)).toEqual(["Raju shrestha"]);
  });

  it("still lists a person named Guest when they have an email", () => {
    const list = customersFromBookings([
      row("1", "Guest", "guest@example.com", "2026-10-01T01:00:00.000Z"),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "Guest", email: "guest@example.com" });
  });

  it("reads a phone number off the booking when there is one", () => {
    const [one] = customersFromBookings([
      row("1", "Ada", "ada@example.com", "2026-09-01T01:00:00.000Z", {
        raw: { guest: { phone: "+977 9800000000" } },
      }),
    ]);
    expect(one!.phone).toBe("+977 9800000000");
  });

  it("filters by name or email", () => {
    const list = customersFromBookings([
      row("1", "Raju shrestha", "raju@example.com", "2026-09-01T01:00:00.000Z"),
      row("2", "Mohit", "m@acme.test", "2026-09-02T01:00:00.000Z"),
    ]);
    expect(filterCustomers(list, "raj").map((c) => c.name)).toEqual(["Raju shrestha"]);
    expect(filterCustomers(list, "ACME").map((c) => c.name)).toEqual(["Mohit"]);
    expect(filterCustomers(list, "")).toHaveLength(2);
  });
});

describe("what is missing from the form", () => {
  const customer = {
    key: "k",
    name: "Raju",
    email: "raju@example.com",
    source: "Bookings" as const,
  };

  it("asks for things in the order they appear", () => {
    const base = { hasEventType: true, hasSlot: true, customer, needsEmail: true };
    expect(appointmentProblem({ ...base, hasEventType: false, hasSlot: false, customer: null })).toBe(
      "Select a consultation.",
    );
    expect(appointmentProblem({ ...base, hasSlot: false, customer: null })).toBe(
      "Select a date and time.",
    );
    expect(appointmentProblem({ ...base, customer: null })).toBe("Select a client.");
    expect(appointmentProblem(base)).toBeNull();
  });

  it("only insists on an email when the CRM needs one", () => {
    const noEmail = { ...customer, email: "  " };
    const base = { hasEventType: true, hasSlot: true, customer: noEmail };
    expect(appointmentProblem({ ...base, needsEmail: true })).toMatch(/no email address/);
    expect(appointmentProblem({ ...base, needsEmail: false })).toBeNull();
  });
});
