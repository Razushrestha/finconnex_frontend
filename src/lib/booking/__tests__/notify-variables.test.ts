import { describe, expect, it } from "vitest";
import {
  DATE_FORMATS,
  DEFAULT_DATE_FORMAT,
  NOTIFY_VARIABLE_GROUPS,
  NOTIFY_VARIABLE_TOKENS,
  dateFormatOptions,
  formatDatePattern,
  insertAtSelection,
  minutesLabel,
  normalizeDateFormat,
} from "@/lib/booking/notify-variables";
import {
  confirmEmailCopy,
  notifyTokensFor,
  sampleNotifyTokens,
} from "@/lib/booking/notify";
import {
  DEFAULT_NOTIFICATIONS,
  interpolateNotify,
  type NotifyTokens,
} from "@/lib/booking/notify-prefs";
import type { Booking, BookingPage } from "@/lib/booking/types";

// The day used in the date-format examples: 2 October 2026.
const OCT_2 = new Date(2026, 9, 2);

describe("Insert Variable list", () => {
  it("has exactly the groups and variables asked for, in order", () => {
    expect(
      NOTIFY_VARIABLE_GROUPS.map((group) => [
        group.title,
        group.items.map((item) => item.label),
      ]),
    ).toEqual([
      ["Business", ["Business Name", "Business Contact Number", "Business Address"]],
      [
        "Staff",
        [
          "Staff Name",
          "Staff Email",
          "Staff Contact Number",
          "Staff ID",
          "Staff Timezone",
          "Staff Additional Info",
        ],
      ],
      ["Workspace", ["Workspace Booking URL"]],
      ["Service", ["Consultation Name", "Service Booking URL", "Service Description"]],
      ["Buffer Time", ["Pre-buffer", "Post-buffer"]],
      [
        "Client",
        [
          "Client Name",
          "Client Email",
          "Client Contact Number",
          "Client First Name",
          "Client Last Name",
        ],
      ],
      [
        "Appointment",
        [
          "Appointment Id",
          "Appointment Time",
          "Appointment From Date",
          "Appointment To Date",
          "Booking Id",
          "Booking Summary URL",
          "Booknow Link",
        ],
      ],
      ["Meeting Details", ["Meeting Info"]],
    ]);
  });

  it("gives every variable its own {{token}}", () => {
    expect(NOTIFY_VARIABLE_TOKENS).toHaveLength(
      NOTIFY_VARIABLE_GROUPS.reduce((n, group) => n + group.items.length, 0),
    );
    expect(new Set(NOTIFY_VARIABLE_TOKENS).size).toBe(NOTIFY_VARIABLE_TOKENS.length);
    for (const token of NOTIFY_VARIABLE_TOKENS) {
      expect(token).toMatch(/^\{\{[a-z_.]+\}\}$/);
    }
  });

  it("every variable is understood by the sender (none is left as raw {{text}})", () => {
    const sample = sampleNotifyTokens(DEFAULT_NOTIFICATIONS[1], OCT_2);
    for (const token of NOTIFY_VARIABLE_TOKENS) {
      expect(interpolateNotify(token, sample), token).not.toContain("{{");
    }
  });
});

describe("date formats", () => {
  // Straight from the "Select Date Format For Mail" list, for 2 October 2026.
  const expected: Record<string, string> = {
    "dd-MMM-yy": "02-Oct-26",
    "dd-MMM-yyyy": "02-Oct-2026",
    "dd-MMMM-yy": "02-October-26",
    "dd-MMMM-yyyy": "02-October-2026",
    "MM-dd-yy": "10-02-26",
    "yy-MM-dd": "26-10-02",
    "MM.dd.yy": "10.02.26",
    "dd/MM/yyyy": "02/10/2026",
    "dd MMM, yy": "02 Oct, 26",
    "MMM dd, yy": "Oct 02, 26",
    "dd MMM, yyyy": "02 Oct, 2026",
    "MMM dd, yyyy": "Oct 02, 2026",
    "dd MMMM, yy": "02 October, 26",
    "MMMM dd, yy": "October 02, 26",
  };

  it.each(Object.entries(expected))("%s → %s", (format, text) => {
    expect(formatDatePattern(OCT_2, format)).toBe(text);
  });

  it("also writes the long forms", () => {
    expect(formatDatePattern(OCT_2, "dd MMMM, yyyy")).toBe("02 October, 2026");
    expect(formatDatePattern(OCT_2, "MMMM dd, yyyy")).toBe("October 02, 2026");
  });

  it("offers every style once, with the default being dd-MMM-yyyy", () => {
    expect(DEFAULT_DATE_FORMAT).toBe("dd-MMM-yyyy");
    expect(new Set(DATE_FORMATS).size).toBe(DATE_FORMATS.length);
    for (const format of Object.keys(expected)) {
      expect(DATE_FORMATS).toContain(format);
    }
  });

  it("previews each style in the dropdown label", () => {
    const options = dateFormatOptions(OCT_2);
    expect(options).toHaveLength(DATE_FORMATS.length);
    expect(options[1]).toEqual({
      value: "dd-MMM-yyyy",
      label: "dd-MMM-yyyy (02-Oct-2026)",
    });
    expect(options.find((o) => o.value === "MM.dd.yy")?.label).toBe(
      "MM.dd.yy (10.02.26)",
    );
  });

  it("pads single digits and shortens September to Sep", () => {
    expect(formatDatePattern(new Date(2007, 0, 5), "dd-MMM-yy")).toBe("05-Jan-07");
    expect(formatDatePattern(new Date(2026, 8, 30), "dd MMM, yyyy")).toBe(
      "30 Sep, 2026",
    );
    expect(formatDatePattern(new Date(2026, 11, 31), "MMMM dd, yyyy")).toBe(
      "December 31, 2026",
    );
  });

  it("falls back to the default for anything unknown", () => {
    expect(normalizeDateFormat("MM.dd.yy")).toBe("MM.dd.yy");
    expect(normalizeDateFormat("nonsense")).toBe(DEFAULT_DATE_FORMAT);
    expect(normalizeDateFormat("")).toBe(DEFAULT_DATE_FORMAT);
    expect(normalizeDateFormat(undefined)).toBe(DEFAULT_DATE_FORMAT);
  });
});

describe("minutesLabel", () => {
  it("reads naturally", () => {
    expect(minutesLabel(0)).toBe("None");
    expect(minutesLabel(undefined)).toBe("None");
    expect(minutesLabel(1)).toBe("1 minute");
    expect(minutesLabel(15)).toBe("15 minutes");
    expect(minutesLabel(60)).toBe("1 hour");
    expect(minutesLabel(90)).toBe("1 hour 30 minutes");
    expect(minutesLabel(120)).toBe("2 hours");
  });
});

describe("insertAtSelection", () => {
  it("puts the variable at the caret and moves the caret after it", () => {
    expect(insertAtSelection("Hi , welcome", 3, 3, "{{contact.first_name}}")).toEqual({
      value: "Hi {{contact.first_name}}, welcome",
      caret: 3 + "{{contact.first_name}}".length,
    });
  });

  it("replaces selected text", () => {
    expect(insertAtSelection("Hello NAME!", 6, 10, "{{name}}").value).toBe(
      "Hello {{name}}!",
    );
  });

  it("appends when there is no caret, and clamps stray positions", () => {
    expect(insertAtSelection("Hi ", null, null, "{{name}}").value).toBe("Hi {{name}}");
    expect(insertAtSelection("Hi", 99, 120, "!").value).toBe("Hi!");
    expect(insertAtSelection("Hi", -5, -1, "> ").value).toBe("> Hi");
  });
});

describe("interpolateNotify with the new variables", () => {
  const base: NotifyTokens = {
    name: "Ada Lovelace",
    firstName: "Ada",
    email: "ada@example.com",
    phone: "+61400000000",
    datetime: "02-Oct-2026 · 10:00 AM - 10:30 AM",
    location: "Zoom",
    title: "Discovery",
    timezone: "Australia/Sydney",
    owner: "Sam",
    ownerEmail: "sam@finconnex.com",
  };

  it("fills the date and customer variables", () => {
    const text = interpolateNotify(
      "{{contact.first_name}} {{contact.last_name}} on {{appointment.from_date}} to {{appointment.to_date}} at {{appointment.time}}",
      {
        ...base,
        lastName: "Lovelace",
        fromDate: "02-Oct-2026",
        toDate: "03-Oct-2026",
        appointmentTime: "10:00 AM - 10:30 AM",
      },
    );
    expect(text).toBe(
      "Ada Lovelace on 02-Oct-2026 to 03-Oct-2026 at 10:00 AM - 10:30 AM",
    );
  });

  it("leaves a variable empty when there is no value, rather than printing 'undefined'", () => {
    expect(interpolateNotify("[{{staff.additional_info}}][{{workspace.booking_url}}]", base)).toBe(
      "[][]",
    );
  });

  it("keeps $ sequences in values literal", () => {
    const text = interpolateNotify("{{business.address}}", {
      ...base,
      businessAddress: "Suite $& 5, $1 Pitt St",
    });
    expect(text).toBe("Suite $& 5, $1 Pitt St");
  });

  it("ignores case and spaces inside the braces, and leaves unknown tokens alone", () => {
    expect(interpolateNotify("{{ CONTACT.NAME }} {{not.a.token}}", base)).toBe(
      "Ada Lovelace {{not.a.token}}",
    );
  });

  it("Staff Email prefers the directory email, falling back to the owner's", () => {
    expect(interpolateNotify("{{appointment.user.email}}", base)).toBe("sam@finconnex.com");
    expect(
      interpolateNotify("{{appointment.user.email}}", { ...base, staffEmail: "sam.s@x.com" }),
    ).toBe("sam.s@x.com");
  });
});

describe("tokens built from a real booking", () => {
  const page = {
    id: "p1",
    title: "Intro call",
    slug: "intro-call",
    owner: "Sam Staff",
    consultants: ["Sam Staff"],
    eventType: "Consultation",
    timezone: "Australia/Sydney",
    description: "A quick chat",
    bufferMinutes: 15,
    schedulingRules: {
      postBufferMinutes: 5,
      slotType: "adjusted",
      intervalMinutes: 30,
      cancelWindowEnabled: false,
      cancelWindowMinutes: 0,
    },
    meetingVia: "video",
    meetingViaDetail: "Zoom",
  } as unknown as BookingPage;
  const booking = {
    id: "bk-abc123",
    pageId: "p1",
    pageSlug: "intro-call",
    eventType: "Consultation",
    guestName: "Ada Lovelace",
    guestEmail: "ada@example.com",
    guestPhone: "+61400000000",
    start: "2026-10-02T10:00:00",
    end: "2026-10-02T10:30:00",
    answers: {},
    status: "Confirmed",
    manageToken: "tok-xyz",
    reference: "NE-00007",
    joinUrl: "https://zoom.us/j/123",
  } as unknown as Booking;
  const origin = "https://crm.test";

  it("writes dates in the default style", () => {
    const t = notifyTokensFor(page, booking, { origin });
    expect(t.fromDate).toBe("02-Oct-2026");
    expect(t.toDate).toBe("02-Oct-2026");
    expect(t.appointmentTime).toBe("10:00 AM - 10:30 AM");
    expect(t.datetime).toBe("02-Oct-2026 · 10:00 AM - 10:30 AM");
  });

  it("follows the chosen date format everywhere a date appears", () => {
    const t = notifyTokensFor(page, booking, { origin, dateFormat: "MMMM dd, yyyy" });
    expect(t.fromDate).toBe("October 02, 2026");
    expect(t.datetime).toBe("October 02, 2026 · 10:00 AM - 10:30 AM");
    const subject = interpolateNotify(
      "Confirmed on {{appointment.start_time}} / {{appointment.from_date}}",
      t,
    );
    expect(subject).toBe(
      "Confirmed on October 02, 2026 · 10:00 AM - 10:30 AM / October 02, 2026",
    );
  });

  it("uses the end date for To Date when the booking runs past midnight", () => {
    const t = notifyTokensFor(
      page,
      { ...booking, end: "2026-10-03T00:30:00" },
      { origin, dateFormat: "dd/MM/yyyy" },
    );
    expect(t.fromDate).toBe("02/10/2026");
    expect(t.toDate).toBe("03/10/2026");
  });

  it("fills customer, appointment, link, buffer and meeting variables", () => {
    const t = notifyTokensFor(page, booking, { origin });
    const out = (token: string) => interpolateNotify(token, t);
    expect(out("{{contact.first_name}}|{{contact.last_name}}")).toBe("Ada|Lovelace");
    expect(out("{{contact.email}}|{{contact.phone}}")).toBe(
      "ada@example.com|+61400000000",
    );
    expect(out("{{appointment.title}}")).toBe("Intro call");
    expect(out("{{appointment.id}}|{{booking.id}}")).toBe("bk-abc123|NE-00007");
    expect(out("{{service.booking_url}}")).toBe("https://crm.test/book/intro-call");
    expect(out("{{booking.book_now_url}}")).toBe("https://crm.test/book/intro-call");
    expect(out("{{booking.summary_url}}")).toBe(
      "https://crm.test/book/intro-call/manage/tok-xyz",
    );
    expect(out("{{service.description}}")).toBe("A quick chat");
    expect(out("{{buffer.pre}}|{{buffer.post}}")).toBe("15 minutes|5 minutes");
    expect(out("{{staff.timezone}}")).toBe("Australia/Sydney");
    expect(out("{{appointment.user.name}}")).toBe("Sam Staff");
    expect(out("{{meeting.info}}")).toBe("Video · Zoom: https://zoom.us/j/123");
  });

  it("shows 'None' for buffers that are not set and falls back to the internal id", () => {
    const t = notifyTokensFor(
      { ...page, bufferMinutes: 0, schedulingRules: undefined } as BookingPage,
      { ...booking, reference: undefined },
      { origin },
    );
    expect(interpolateNotify("{{buffer.pre}}|{{buffer.post}}", t)).toBe("None|None");
    expect(interpolateNotify("{{booking.id}}", t)).toBe("bk-abc123");
  });

  it("leaves what the CRM does not hold blank instead of inventing it", () => {
    const t = notifyTokensFor(page, booking, { origin });
    expect(interpolateNotify("[{{staff.additional_info}}]", t)).toBe("[]");
    expect(interpolateNotify("[{{workspace.booking_url}}]", t)).toBe("[]");
  });

  it("does not change who gets emailed as the assigned user", () => {
    // Only an owner that is itself an email address is ever emailed.
    expect(notifyTokensFor(page, booking, { origin }).ownerEmail).toBe("");
    expect(
      notifyTokensFor({ ...page, owner: "sam@finconnex.com" } as BookingPage, booking, {
        origin,
      }).ownerEmail,
    ).toBe("sam@finconnex.com");
  });
});

describe("the Booked email's date", () => {
  const page = {
    id: "p1",
    title: "Intro call",
    slug: "intro-call",
    owner: "Sam Staff",
    consultants: ["Sam Staff"],
    timezone: "Australia/Sydney",
  } as unknown as BookingPage;
  const booking = {
    id: "bk-1",
    guestName: "Ada Lovelace",
    guestEmail: "ada@example.com",
    start: "2026-10-02T10:00:00",
    end: "2026-10-02T10:30:00",
    manageToken: "tok-xyz",
    reference: "NE-00007",
  } as unknown as Booking;

  it("uses the default style when none is chosen", () => {
    expect(confirmEmailCopy(page, booking).html).toContain("<strong>02-Oct-2026</strong>");
  });

  it("uses the style picked in the editor", () => {
    expect(confirmEmailCopy(page, booking, "MMMM dd, yyyy").html).toContain(
      "<strong>October 02, 2026</strong>",
    );
    expect(confirmEmailCopy(page, booking, "dd/MM/yyyy").text).toContain("02/10/2026");
  });
});

describe("sample tokens for Send test", () => {
  it("dates the sample tomorrow in the chosen format", () => {
    const t = sampleNotifyTokens({ title: "Booked", dateFormat: "dd-MMM-yy" }, OCT_2);
    expect(t.fromDate).toBe("03-Oct-26");
    expect(t.datetime).toBe("03-Oct-26 · 10:00 AM - 10:30 AM");
  });

  it("rolls over month ends", () => {
    const t = sampleNotifyTokens({ title: "Booked" }, new Date(2026, 9, 31));
    expect(t.fromDate).toBe("01-Nov-2026");
  });
});
