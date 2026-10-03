import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bindCrmSession } from "@/lib/activity-timeline";
import { deleteCrmEventType, removeConsultationPage } from "@/lib/booking/api";
import {
  listBookingPages,
  upsertBookingPage,
  WEEKDAYS,
  type BookingPage,
} from "@/lib/booking/types";

const SESSION = {
  baseUrl: "https://crm.booking.test",
  accessToken: "test-access",
  workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};
const EVENT = "11111111-1111-4111-8111-111111111111";

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
  };
}

function installWindowStore() {
  const store = memoryStore();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: store,
      sessionStorage: store,
    },
  });
}

function samplePage(id: string, crmEventTypeId?: string): BookingPage {
  return {
    id,
    title: "Day test",
    slug: "day-test",
    owner: "Ada",
    eventType: "Consultation",
    durationMinutes: 90,
    bufferMinutes: 0,
    timezone: "Australia/Sydney",
    description: "",
    availability: WEEKDAYS.map((day) => ({
      day,
      enabled: true,
      start: "09:00",
      end: "17:00",
    })),
    questions: [],
    confirmationTemplate: "",
    reminderTemplate: "",
    status: "Live",
    views: 0,
    bookingsCount: 0,
    cancelRate: 0,
    createdAt: "",
    crmEventTypeId,
  };
}

function jsonResponse(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("removeConsultationPage", () => {
  const hits: string[] = [];
  let originalFetch: typeof fetch;
  let deleteStatus = 200;
  let deleteBody: unknown = { statusCode: 200, data: { id: EVENT } };

  beforeEach(() => {
    hits.length = 0;
    deleteStatus = 200;
    deleteBody = { statusCode: 200, data: { id: EVENT } };
    installWindowStore();
    bindCrmSession(SESSION);
    originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), SESSION.baseUrl);
      const method = (init?.method ?? "GET").toUpperCase();
      hits.push(`${method} ${url.pathname}`);
      if (method === "DELETE" && url.pathname.endsWith(`/event-types/${EVENT}`)) {
        return jsonResponse(deleteStatus, deleteBody);
      }
      return jsonResponse(404, { statusCode: 404, message: "not found" });
    }) as typeof fetch;
  });

  afterEach(() => {
    bindCrmSession(null);
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(globalThis, "window");
  });

  it("DELETEs the CRM event type then drops the local card", async () => {
    upsertBookingPage(samplePage(EVENT, EVENT));
    expect(listBookingPages()).toHaveLength(1);

    await removeConsultationPage({ id: EVENT, crmEventTypeId: EVENT });

    expect(hits).toContain(
      `DELETE /v1/workspaces/${SESSION.workspaceId}/booking/event-types/${EVENT}`,
    );
    expect(listBookingPages()).toHaveLength(0);
  });

  it("drops a local copy keyed by crmEventTypeId", async () => {
    upsertBookingPage(samplePage("local-day", EVENT));
    await removeConsultationPage({ id: "local-day", crmEventTypeId: EVENT });
    expect(listBookingPages()).toHaveLength(0);
  });

  it("keeps the card when upcoming bookings block delete", async () => {
    deleteStatus = 409;
    deleteBody = {
      statusCode: 409,
      message: "booking.error.eventTypeHasUpcomingBookings",
    };
    upsertBookingPage(samplePage(EVENT, EVENT));

    await expect(
      removeConsultationPage({ id: EVENT, crmEventTypeId: EVENT }),
    ).rejects.toThrow(/upcoming appointments/i);
    expect(listBookingPages()).toHaveLength(1);
  });

  it("treats a missing CRM event type as already deleted", async () => {
    deleteStatus = 404;
    deleteBody = { statusCode: 404, message: "booking.error.eventTypeNotFound" };
    await expect(deleteCrmEventType(EVENT)).resolves.toBeUndefined();
  });
});
