import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BookingRulesStep,
  DEFAULT_RULES,
  rulesErrors,
  rulesFromPage,
  rulesToPageFields,
  ruleMinutes,
  timeFromMinutes,
  type BookingRulesValues,
} from "@/components/booking/BookingRulesStep";
import type { BookingPage } from "@/lib/booking/types";

function rules(partial: Partial<BookingRulesValues> = {}): BookingRulesValues {
  return { ...DEFAULT_RULES, ...partial };
}

function page(partial: Partial<BookingPage> = {}): BookingPage {
  return {
    id: "p1",
    title: "Consult",
    slug: "consult",
    owner: "Admin",
    eventType: "Consultation",
    durationMinutes: 45,
    bufferMinutes: 0,
    timezone: "Australia/Sydney",
    description: "",
    availability: [],
    questions: [],
    confirmationTemplate: "",
    reminderTemplate: "",
    status: "Live",
    views: 0,
    bookingsCount: 0,
    cancelRate: 0,
    createdAt: "",
    ...partial,
  };
}

describe("rule time helpers", () => {
  it("adds days, hours and minutes", () => {
    expect(ruleMinutes({ days: 1, hours: 2, minutes: 30 })).toBe(1590);
    expect(ruleMinutes({ days: 0, hours: 0, minutes: 0 })).toBe(0);
  });

  it("splits minutes back into days, hours and minutes", () => {
    expect(timeFromMinutes(1590)).toEqual({ days: 1, hours: 2, minutes: 30 });
    expect(timeFromMinutes(90, false)).toEqual({ days: 0, hours: 1, minutes: 30 });
    expect(timeFromMinutes(-5)).toEqual({ days: 0, hours: 0, minutes: 0 });
    expect(timeFromMinutes(Number.NaN)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });
});

describe("rulesToPageFields", () => {
  it("keeps the old defaults when nothing is changed", () => {
    const fields = rulesToPageFields(rules(), { durationMinutes: 30 });
    expect(fields.durationMinutes).toBe(30);
    expect(fields.bufferMinutes).toBe(0);
    expect(fields.minNoticeHours).toBe(0);
    // A zero maximum notice keeps the usual 60-day horizon.
    expect(fields.maxAdvanceDays).toBe(60);
    expect(fields.maxAttendees).toBe(1);
  });

  it("maps buffers, notice and horizon onto the page fields", () => {
    const fields = rulesToPageFields(
      rules({
        preBuffer: { days: 0, hours: 1, minutes: 15 },
        postBuffer: { days: 0, hours: 0, minutes: 10 },
        minNotice: { days: 1, hours: 2, minutes: 30 },
        maxNotice: { days: 30, hours: 0, minutes: 0 },
      }),
      { durationMinutes: 45 },
    );
    expect(fields.durationMinutes).toBe(45);
    expect(fields.bufferMinutes).toBe(75);
    expect(fields.minNoticeHours).toBe(26.5);
    expect(fields.maxAdvanceDays).toBe(30);
    expect(fields.schedulingRules.postBufferMinutes).toBe(10);
  });

  it("rounds a partial day of maximum notice up, never down to nothing", () => {
    const fields = rulesToPageFields(
      rules({ maxNotice: { days: 0, hours: 12, minutes: 0 } }),
      { durationMinutes: 30 },
    );
    expect(fields.maxAdvanceDays).toBe(1);
  });

  it("keeps values inside what the booking API accepts", () => {
    const fields = rulesToPageFields(
      rules({
        preBuffer: { days: 0, hours: 20, minutes: 0 },
        minNotice: { days: 40, hours: 0, minutes: 0 },
        maxNotice: { days: 900, hours: 0, minutes: 0 },
      }),
      { durationMinutes: 30 },
    );
    expect(fields.bufferMinutes).toBe(480);
    expect(fields.minNoticeHours).toBe(14 * 24);
    expect(fields.maxAdvanceDays).toBe(365);
  });

  it("stores the interval, slot type and cancellation window", () => {
    const fields = rulesToPageFields(
      rules({
        slotType: "fixed",
        interval: { days: 0, hours: 1, minutes: 0 },
        cancelEnabled: true,
        cancelWindow: { days: 1, hours: 0, minutes: 0 },
      }),
      { durationMinutes: 30 },
    );
    expect(fields.schedulingRules).toMatchObject({
      slotType: "fixed",
      intervalMinutes: 60,
      cancelWindowEnabled: true,
      cancelWindowMinutes: 1440,
    });
  });

  it("only lets group consultations set capacity", () => {
    const rule = rules({ maxAttendees: 12 });
    expect(rulesToPageFields(rule, { durationMinutes: 30 }).maxAttendees).toBe(1);
    expect(
      rulesToPageFields(rule, { durationMinutes: 30, group: true }).maxAttendees,
    ).toBe(12);
    expect(
      rulesToPageFields(rules({ maxAttendees: 0 }), {
        durationMinutes: 30,
        group: true,
      }).maxAttendees,
    ).toBe(2);
  });
});

describe("rulesFromPage", () => {
  it("reads a saved page back into the controls", () => {
    const values = rulesFromPage(
      page({
        bufferMinutes: 75,
        minNoticeHours: 26.5,
        maxAdvanceDays: 30,
        schedulingRules: {
          postBufferMinutes: 10,
          slotType: "fixed",
          intervalMinutes: 30,
          cancelWindowEnabled: false,
          cancelWindowMinutes: 120,
        },
      }),
    );
    expect(values.preBuffer).toEqual({ days: 0, hours: 1, minutes: 15 });
    expect(values.postBuffer).toEqual({ days: 0, hours: 0, minutes: 10 });
    expect(values.minNotice).toEqual({ days: 1, hours: 2, minutes: 30 });
    expect(values.maxNotice).toEqual({ days: 30, hours: 0, minutes: 0 });
    expect(values.slotType).toBe("fixed");
    expect(values.interval).toEqual({ days: 0, hours: 0, minutes: 30 });
    expect(values.cancelEnabled).toBe(false);
    expect(values.cancelWindow).toEqual({ days: 0, hours: 2, minutes: 0 });
  });

  it("falls back to the usual defaults for a page saved before these settings", () => {
    const values = rulesFromPage(page());
    expect(values.minNotice).toEqual({ days: 0, hours: 2, minutes: 0 });
    expect(values.maxNotice.days).toBe(60);
    expect(values.slotType).toBe("adjusted");
    expect(values.interval.minutes).toBe(15);
    expect(values.cancelEnabled).toBe(true);
  });

  it("round-trips through rulesToPageFields", () => {
    const original = rules({
      preBuffer: { days: 0, hours: 0, minutes: 20 },
      minNotice: { days: 2, hours: 0, minutes: 0 },
      maxNotice: { days: 90, hours: 0, minutes: 0 },
    });
    const fields = rulesToPageFields(original, { durationMinutes: 30 });
    const back = rulesFromPage(
      page({
        bufferMinutes: fields.bufferMinutes,
        minNoticeHours: fields.minNoticeHours,
        maxAdvanceDays: fields.maxAdvanceDays,
        schedulingRules: fields.schedulingRules,
      }),
    );
    expect(back.preBuffer).toEqual(original.preBuffer);
    expect(back.minNotice).toEqual(original.minNotice);
    expect(back.maxNotice).toEqual(original.maxNotice);
  });
});

describe("rulesErrors", () => {
  it("accepts the defaults", () => {
    expect(rulesErrors(rules())).toEqual({});
  });

  it("needs the maximum notice to be longer than the minimum", () => {
    const errors = rulesErrors(
      rules({
        minNotice: { days: 2, hours: 0, minutes: 0 },
        maxNotice: { days: 1, hours: 0, minutes: 0 },
      }),
    );
    expect(errors.notice).toMatch(/longer than the minimum/);
    // Zero means "no maximum", which is always fine.
    expect(
      rulesErrors(rules({ minNotice: { days: 2, hours: 0, minutes: 0 } })).notice,
    ).toBeUndefined();
  });

  it("rejects an interval under five minutes", () => {
    expect(
      rulesErrors(rules({ interval: { days: 0, hours: 0, minutes: 0 } })).interval,
    ).toMatch(/at least 5 minutes/);
  });

  it("needs two attendees for a group", () => {
    expect(rulesErrors(rules({ maxAttendees: 1 }), true).attendees).toMatch(
      /at least 2/,
    );
    expect(rulesErrors(rules({ maxAttendees: 1 }), false).attendees).toBeUndefined();
  });
});

describe("Scheduling Rules markup", () => {
  function render(props: Record<string, unknown> = {}) {
    return renderToStaticMarkup(
      createElement(BookingRulesStep, {
        onBack: () => undefined,
        onSave: () => undefined,
        ...props,
      }),
    );
  }

  it("shows the four sections in order", () => {
    const html = render();
    const order = [
      "Scheduling Rules",
      "Buffer Time",
      "Booking Notice",
      "Scheduling Interval",
      "Cancellation and Rescheduling Window",
    ].map((title) => html.indexOf(title));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("labels every card with its helper text", () => {
    const html = render();
    for (const text of [
      "Pre-buffer",
      "Extra time added before an appointment",
      "Post-buffer",
      "Extra time added after an appointment",
      "Minimum Booking Notice",
      "Shortest notice required to avoid last-minute bookings",
      "Maximum Booking Notice",
      "How far in advance an appointment can be booked",
      "The interval between each appointment",
      "How much time before an appointment it can be rescheduled or",
    ]) {
      expect(html).toContain(text);
    }
  });

  it("starts at zero with a 15 minute adjusted interval", () => {
    const html = render();
    expect(html).toContain("0 Hours");
    expect(html).toContain("0 Minutes");
    expect(html).toContain("15 Minutes");
    expect(html).toContain("Adjusted Slots");
    // Three Days boxes: minimum notice, maximum notice, cancellation window.
    expect(html.match(/inputMode="numeric"/g)).toHaveLength(3);
    expect(html.match(/>Days</g)).toHaveLength(3);
  });

  it("explains adjusted slots, and the cancellation switch starts on", () => {
    const html = render();
    expect(html).toContain("Time slots adjust to accommodate other appointments");
    expect(html).toContain('aria-checked="true"');
  });

  it("explains fixed slots when that type is saved", () => {
    const html = render({ initial: rules({ slotType: "fixed" }) });
    expect(html).toContain("Fixed Slots");
    expect(html).toContain("always start on the interval you set");
    expect(html).not.toContain("Time slots adjust to accommodate");
  });

  it("uses a singular unit for one hour or minute", () => {
    const html = render({
      initial: rules({ preBuffer: { days: 0, hours: 1, minutes: 0 } }),
    });
    expect(html).toContain("1 Hour");
    expect(html).not.toContain("1 Hours");
  });

  it("greys out and locks the window when the switch is off", () => {
    const html = render({ initial: rules({ cancelEnabled: false }) });
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("inert");
    expect(html).toContain("opacity-50");
  });

  it("shows Back and Next in the wizard but not when embedded", () => {
    const wizard = render();
    expect(wizard).toContain(">Back<");
    expect(wizard).toContain(">Next<");
    const embedded = render({ embedded: true });
    expect(embedded).not.toContain(">Back<");
    expect(embedded).not.toContain(">Next<");
  });

  it("titles the page once: the wizard has its own heading, the Overview supplies it", () => {
    const titles = (html: string) => html.match(/>Scheduling Rules</g)?.length ?? 0;
    expect(titles(render())).toBe(1);
    expect(render()).toContain("<h1");

    const embedded = render({ embedded: true });
    expect(titles(embedded)).toBe(0);
    expect(embedded).not.toContain("<h1");
    // Only the heading goes: every section is still there.
    for (const section of ["Buffer Time", "Booking Notice", "Scheduling Interval"]) {
      expect(embedded).toContain(section);
    }
  });

  it("shows the capacity card only for group consultations", () => {
    expect(render()).not.toContain("Group Capacity");
    const html = render({ group: true });
    expect(html).toContain("Group Capacity");
    expect(html).toContain("Maximum attendees per slot");
    expect(html).toContain("Guests");
  });

  it("flags a maximum notice shorter than the minimum", () => {
    const html = render({
      initial: rules({
        minNotice: { days: 3, hours: 0, minutes: 0 },
        maxNotice: { days: 1, hours: 0, minutes: 0 },
      }),
    });
    expect(html).toContain("Maximum booking notice must be longer");
    expect(html).toContain('role="alert"');
  });

  it("sizes the controls so Days, Hours and Minutes stay on one line", () => {
    const html = render();
    // A small, nearly square Days box and dropdowns with a narrow flexible range.
    expect(html).toContain("w-14");
    expect(html).toContain("min-w-[108px] max-w-[116px]");
    expect(html).toContain("min-w-[124px] max-w-[132px]");
    expect(html).toContain("w-[150px]");
  });

  it("puts cards side by side by panel width, not screen width", () => {
    const html = render();
    expect(html).toContain("@container");
    expect(html).toContain("@[820px]:grid-cols-2");
    // Not the screen-width breakpoint that ignored the wizard sidebar.
    expect(html).not.toContain("md:grid-cols-2");
  });
});
