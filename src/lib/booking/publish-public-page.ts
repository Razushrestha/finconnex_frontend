import type { BookingPage } from "@/lib/booking/types";

export function publishPublicBookingPage(page: BookingPage) {
  if (typeof window === "undefined") return;
  if (page.status && page.status !== "Live") return;
  void fetch("/api/book/publish", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(page),
  }).catch(() => undefined);
}
