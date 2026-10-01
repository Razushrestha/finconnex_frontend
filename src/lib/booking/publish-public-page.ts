import type { BookingPage } from "@/lib/booking/types";

export function publishPublicBookingPage(page: BookingPage) {
  if (typeof window === "undefined") return Promise.resolve();
  if (page.status && page.status !== "Live") return Promise.resolve();
  return fetch("/api/book/publish", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(page),
  }).then(async (res) => {
    if (res.ok) return;
    throw new Error("Could not publish the booking page");
  });
}
