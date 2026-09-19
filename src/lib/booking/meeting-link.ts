import type { BookingPage } from "@/lib/booking/types";

function randomRoomKey() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
    "",
  );
}

function looksLikeHttpsJoin(url: string) {
  return /^https:\/\//i.test(url.trim());
}

/** Host-pasted Zoom / Meet / Teams / Jitsi links are real; invented Meet codes are not. */
export function isHostProvidedJoinUrl(url: string | undefined): boolean {
  const value = url?.trim() ?? "";
  if (!looksLikeHttpsJoin(value)) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === "meet.google.com" || host.endsWith(".meet.google.com")) {
      return /\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/i.test(new URL(value).pathname);
    }
    return true;
  } catch {
    return false;
  }
}

export function conferencingKind(page: BookingPage): "zoom" | "google_meet" | "none" {
  const detail = `${page.meetingViaDetail ?? ""} ${page.videoLink ?? ""}`.toLowerCase();
  if (page.meetingVia === "phone" || page.meetingVia === "in_person") return "none";
  if (detail.includes("zoom")) return "zoom";
  if (
    detail.includes("google") ||
    detail.includes("meet") ||
    page.meetingVia === "video" ||
    page.eventType === "Consultation"
  ) {
    return "google_meet";
  }
  return "none";
}

/**
 * Google Meet and Zoom IDs cannot be invented — those hosts reject random codes.
 * Use a host-supplied https link, else a unique Jitsi room that actually opens.
 */
export function allocateConferencingLink(
  page: BookingPage,
  roomKey?: string,
): string | undefined {
  const existing = page.videoLink?.trim();
  if (isHostProvidedJoinUrl(existing)) return existing;
  if (conferencingKind(page) === "none") return undefined;
  const key = (roomKey || randomRoomKey()).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
  if (!key) return undefined;
  return `https://meet.jit.si/FinConnex-${key}`;
}
