import { describe, expect, it } from "vitest";
import {
  bookingPageMatchesSlug,
  bookingSlugKey,
  type BookingPage,
} from "@/lib/booking/types";

const page = (slug: string, title = "TEST2"): BookingPage => ({
  id: "p1",
  title,
  slug,
  owner: "Ada",
  eventType: "Consultation",
  durationMinutes: 30,
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
});

describe("public booking slugs", () => {
  it("matches /book/test2 to a TEST2 consultation", () => {
    expect(bookingSlugKey("TEST2")).toBe("test2");
    expect(bookingSlugKey("/book/test2")).toBe("test2");
    expect(bookingPageMatchesSlug(page("test2", "TEST2"), "TEST2")).toBe(true);
    expect(bookingPageMatchesSlug(page("test2", "TEST2"), "test2")).toBe(true);
  });
});
