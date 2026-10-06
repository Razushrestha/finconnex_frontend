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
      return new URL(value).pathname.replace(/\/+$/, "").length > 1;
    }
    return true;
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const JOIN_FIELDS = [
  "meetingLink",
  "meeting_link",
  "meetingUrl",
  "meeting_url",
  "joinUrl",
  "join_url",
  "conferenceUrl",
  "conference_url",
  "hangoutLink",
  "hangout_link",
  "googleMeetUrl",
  "googleMeetLink",
  "google_meet_url",
  "locationUrl",
  "location_url",
];

function httpsField(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && isHostProvidedJoinUrl(value)) return value.trim();
  }
  return undefined;
}

function entryPointUrl(value: unknown): string | undefined {
  const points = Array.isArray(value) ? value : asRecord(value)?.entryPoints;
  if (!Array.isArray(points)) return undefined;
  for (const point of points) {
    const row = asRecord(point);
    const uri = row?.uri ?? row?.url;
    if (typeof uri === "string" && isHostProvidedJoinUrl(uri)) return uri.trim();
  }
  return undefined;
}

function joinFromNode(value: unknown): string | undefined {
  const item = asRecord(value);
  if (!item) return undefined;
  return (
    httpsField(item, [...JOIN_FIELDS, "uri", "url", "link"]) ||
    entryPointUrl(item) ||
    undefined
  );
}

/** The real join URL on a CRM booking or meeting, when the host did not invent one. */
export function joinUrlFromRecord(value: unknown): string | undefined {
  const row = asRecord(value);
  if (!row) return undefined;
  const direct = httpsField(row, JOIN_FIELDS);
  if (direct) return direct;
  const location = asRecord(row.location);
  const fromLocation = location
    ? joinFromNode(location)
    : typeof row.location === "string" && isHostProvidedJoinUrl(row.location)
      ? row.location.trim()
      : undefined;
  if (fromLocation) return fromLocation;
  for (const nested of [row.meeting, row.conference, row.conferenceData, row.conferencing, row.googleMeet]) {
    const item = asRecord(nested);
    const found =
      joinFromNode(item) ||
      joinFromNode(item?.conference) ||
      joinFromNode(item?.conferenceData) ||
      entryPointUrl(item?.entryPoints);
    if (found) return found;
  }
  return entryPointUrl(row.entryPoints);
}

/** The first value that is a real https join URL, ignoring labels such as "Google Meet". */
export function firstHostJoinUrl(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    if (isHostProvidedJoinUrl(value ?? undefined)) return value!.trim();
  }
  return undefined;
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
