import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  EventTypeEditForm,
  meetingModeLabel,
  paymentMode,
} from "@/components/booking/ConsultationOverview";
import type { BookingPage } from "@/lib/booking/types";

function page(partial: Partial<BookingPage>): BookingPage {
  return partial as BookingPage;
}

describe("event type payment and meeting labels", () => {
  it("shows Payment Mode as Online or Offline, and Meeting Mode as the location", () => {
    expect(
      paymentMode(page({ meetingVia: "in_person", location: "In person" })),
    ).toBe("Offline");
    expect(
      meetingModeLabel(page({ meetingVia: "in_person", location: "In person" })),
    ).toBe("—");
    expect(
      meetingModeLabel(
        page({
          meetingVia: "in_person",
          location: "Level 12, 100 Pitt Street, Sydney NSW 2000",
        }),
      ),
    ).toBe("Level 12, 100 Pitt Street, Sydney NSW 2000");
  });

  it("shows a dash for an online meeting with no platform", () => {
    expect(paymentMode(page({ meetingVia: "video" }))).toBe("Online");
    expect(meetingModeLabel(page({ meetingVia: "video" }))).toBe("—");
    expect(
      meetingModeLabel(page({ meetingVia: "video", meetingViaDetail: "Zoom" })),
    ).toBe("Zoom");
  });

  it("puts Payment Type on the edit form, under Duration", () => {
    const html = renderToStaticMarkup(
      createElement(EventTypeEditForm, {
        page: page({
          id: "evt-1",
          title: "Raju shrestha",
          durationMinutes: 90,
          price: 200,
          currency: "AUD",
          meetingVia: "in_person",
          location: "Level 12, 100 Pitt Street, Sydney NSW 2000",
          status: "Live",
          isPublic: false,
        }),
        onCancel: () => {},
        onSaved: () => {},
      }),
    );
    expect(html).toContain("Payment Type");
    expect(html).toContain("Optional");
    expect(html).toContain("Payment Mode");
    const durationAt = html.indexOf("Duration");
    const paymentTypeAt = html.indexOf("Payment Type");
    const meetingAt = html.indexOf("Meeting Mode");
    expect(durationAt).toBeGreaterThan(-1);
    expect(paymentTypeAt).toBeGreaterThan(durationAt);
    expect(meetingAt).toBeGreaterThan(paymentTypeAt);
  });

  it("keeps phone under Online, with Phone as the meeting mode", () => {
    expect(
      paymentMode(page({ meetingVia: "phone", meetingViaDetail: "Phone" })),
    ).toBe("Online");
    expect(
      meetingModeLabel(page({ meetingVia: "phone", meetingViaDetail: "Phone" })),
    ).toBe("Phone");
  });
});
