import { resolveCrmPublicRef } from "@/lib/booking/public-crm-ref";
import type { BookingPage } from "@/lib/booking/types";

export async function publishPublicBookingPage(page: BookingPage) {
  if (typeof window === "undefined") return;
  if (page.status && page.status !== "Live") return;

  // Lets signed-out guests book into the CRM. When it cannot be worked out the
  // page is still published; the server keeps any ref it already has.
  const crmPublic = await resolveCrmPublicRef(page);
  const res = await fetch("/api/book/publish", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(crmPublic ? { ...page, crmPublic } : page),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: unknown } | null;
    throw new Error(
      typeof json?.error === "string" && json.error
        ? json.error
        : "Could not publish the booking page",
    );
  }
}
