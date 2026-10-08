import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking, BookingPage } from "@/lib/booking/types";
import type { EmailNotifyConfig } from "@/lib/booking/email-config";

const sendEmailDemoLive = vi.hoisted(() =>
  vi.fn<(input: Record<string, unknown>) => Promise<{ ok: boolean; mode: string }>>(
    async () => ({ ok: true, mode: "gateway" }),
  ),
);

vi.mock("@/lib/comms/send-gateway", () => ({
  sendEmailDemoLive,
  sendSmsDemoLive: vi.fn(async () => ({ ok: true })),
}));

import {
  DEFAULT_NOTIFICATIONS,
  dispatchBookingNotifications,
} from "@/lib/booking/notify";

const config: EmailNotifyConfig = {
  sendFrom: "default",
  replyTo: "",
  cc: "staff",
  user: { sendFrom: "default", replyTo: "customer", cc: "super_admin" },
  superAdminEmail: "admin@finconnex.com",
};

function pageWith(emailNotifyConfig?: EmailNotifyConfig): BookingPage {
  return {
    id: "p1",
    title: "Intro call",
    slug: "intro-call",
    owner: "sam@finconnex.com",
    consultants: ["Sam Staff"],
    eventType: "Consultation",
    timezone: "Australia/Sydney",
    description: "A quick chat",
    bufferMinutes: 0,
    meetingVia: "video",
    meetingViaDetail: "Zoom",
    notifyPrefs: DEFAULT_NOTIFICATIONS.map((row) =>
      row.id === "confirmed"
        ? {
            ...row,
            channels: { Email: true, "In-app": false, SMS: false, WhatsApp: false },
            notifyContact: true,
            notifyUser: true,
          }
        : row,
    ),
    emailNotifyConfig,
  } as unknown as BookingPage;
}

const booking = {
  id: "bk-abc123",
  pageId: "p1",
  pageSlug: "intro-call",
  eventType: "Consultation",
  guestName: "Ada Lovelace",
  guestEmail: "ada@example.com",
  guestPhone: "",
  start: "2026-10-02T10:00:00",
  end: "2026-10-02T10:30:00",
  answers: {},
  status: "Confirmed",
  manageToken: "tok-xyz",
  reference: "NE-00007",
} as unknown as Booking;

const windowStub = globalThis as unknown as { window: { location?: unknown } };
let originalLocation: unknown;

function sentTo(email: string) {
  const call = sendEmailDemoLive.mock.calls.find(([input]) => input.email === email);
  expect(call, `an email to ${email}`).toBeTruthy();
  return call![0] as { cc?: string[]; replyTo?: string };
}

describe("Email Configurations reach the outgoing mail (dashboard route)", () => {
  beforeEach(() => {
    sendEmailDemoLive.mockClear();
    originalLocation = windowStub.window.location;
    windowStub.window.location = { pathname: "/bookings", origin: "https://crm.test" };
  });
  afterEach(() => {
    windowStub.window.location = originalLocation;
  });

  it("copies and replies as configured for the customer and for the team", async () => {
    await dispatchBookingNotifications({
      event: "confirmed",
      page: pageWith(config),
      booking,
    });
    expect(sendEmailDemoLive).toHaveBeenCalledTimes(2);

    const customer = sentTo("ada@example.com");
    expect(customer.cc).toEqual(["sam@finconnex.com"]);
    expect(customer.replyTo).toBeUndefined();

    // To User: reply goes straight to the customer, the super admin is copied.
    const team = sentTo("sam@finconnex.com");
    expect(team.cc).toEqual(["admin@finconnex.com"]);
    expect(team.replyTo).toBe("ada@example.com");
  });

  it("only defaults the customer's Reply To for a page that was never configured", async () => {
    await dispatchBookingNotifications({
      event: "confirmed",
      page: pageWith(undefined),
      booking,
    });
    expect(sendEmailDemoLive).toHaveBeenCalledTimes(2);
    // Unset customer Reply To means "reply to the staff member" (email-config).
    expect(sentTo("ada@example.com").replyTo).toBe("sam@finconnex.com");
    expect(sentTo("sam@finconnex.com").replyTo).toBeUndefined();
    for (const email of ["ada@example.com", "sam@finconnex.com"]) {
      expect(sentTo(email).cc).toEqual([]);
    }
  });

  it("does not copy the staff member on their own email", async () => {
    await dispatchBookingNotifications({
      event: "confirmed",
      page: pageWith({ ...config, user: { sendFrom: "default", replyTo: "", cc: "staff" } }),
      booking,
    });
    expect(sentTo("sam@finconnex.com").cc).toEqual([]);
  });
});

describe("Email Configurations reach the outgoing mail (public booking page)", () => {
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () =>
      new Response(JSON.stringify({ ok: true, delivered: "sendgrid" }), { status: 200 }),
  );

  beforeEach(() => {
    fetchMock.mockClear();
    sendEmailDemoLive.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    originalLocation = windowStub.window.location;
    windowStub.window.location = { pathname: "/book/intro-call", origin: "https://crm.test" };
  });
  afterEach(() => {
    windowStub.window.location = originalLocation;
    vi.unstubAllGlobals();
  });

  function bodyFor(email: string) {
    const call = fetchMock.mock.calls.find(([, init]) => {
      const body = JSON.parse(String(init.body));
      return body.to === email;
    });
    expect(call, `a request for ${email}`).toBeTruthy();
    expect(call![0]).toBe("/api/book/confirm-mail");
    return JSON.parse(String(call![1].body)) as {
      cc?: string[];
      replyTo?: string;
    };
  }

  it("sends Reply To and Cc with the guest's request", async () => {
    await dispatchBookingNotifications({
      event: "confirmed",
      page: pageWith(config),
      booking,
    });
    expect(sendEmailDemoLive).not.toHaveBeenCalled();

    const customer = bodyFor("ada@example.com");
    expect(customer.cc).toEqual(["sam@finconnex.com"]);
    expect(customer.replyTo).toBeUndefined();

    const team = bodyFor("sam@finconnex.com");
    expect(team.cc).toEqual(["admin@finconnex.com"]);
    expect(team.replyTo).toBe("ada@example.com");
  });

  it("also emails addresses typed into Invite Guest(s)", async () => {
    await dispatchBookingNotifications({
      event: "confirmed",
      page: pageWith(undefined),
      booking: {
        ...booking,
        answers: { guests: "razushrestha9335@gmail.com" },
      },
    });
    expect(sendEmailDemoLive).not.toHaveBeenCalled();
    bodyFor("ada@example.com");
    const invited = bodyFor("razushrestha9335@gmail.com");
    expect("cc" in invited).toBe(false);
  });

  it("adds only the default customer Reply To when nothing is configured", async () => {
    await dispatchBookingNotifications({
      event: "confirmed",
      page: pageWith(undefined),
      booking,
    });
    expect(bodyFor("ada@example.com").replyTo).toBe("sam@finconnex.com");
    expect("replyTo" in bodyFor("sam@finconnex.com")).toBe(false);
    for (const email of ["ada@example.com", "sam@finconnex.com"]) {
      expect("cc" in bodyFor(email)).toBe(false);
    }
  });
});
