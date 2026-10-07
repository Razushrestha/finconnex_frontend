import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  crmBaseUrl,
  decodeJwtPayload,
  resolveLiveCrmAuth,
} from "@/lib/auth/crm-server";
import {
  deliverThroughBookingMailbox,
  deliverThroughPlatformMailer,
} from "@/lib/emails/sendgrid-server";
import { parsePublicSlotDays, publicBookingPath } from "@/lib/booking/public-crm";
import {
  emailBrandFromSettings,
  emailBrandFromValues,
} from "@/lib/emails/brand-mail";
import { normalizeCrmWorkspaceSettings } from "@/lib/settings/api";
import {
  documentRequestInviteCopy,
  inviteDocuments,
} from "@/lib/documents/requests/invite-email";
import {
  bookingIdsForGuest,
  guestMailTokenFromBookings,
  mailTokenFromCreated,
} from "@/lib/documents/requests/invite-mailbox";

export const maxDuration = 60;

/**
 * Sends the document-request invite through the CRM's platform mailer, the
 * same sender that delivers verification codes. If the CRM refuses that send,
 * falls back to the workspace booking mailbox, which needs a booking for the
 * client. A temporary booking is created when none exists, and cancelled only
 * if that send fails.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Session has expired. Sign in again to send mail." },
      { status: 401 },
    );
  }
  const auth = await resolveLiveCrmAuth().catch(() => null);
  const accessToken = auth?.accessToken?.trim() ?? "";
  const base = crmBaseUrl();
  const workspaceId =
    typeof decodeJwtPayload(accessToken)?.workspaceId === "string"
      ? String(decodeJwtPayload(accessToken)?.workspaceId)
      : "";
  if (!accessToken || !base || !workspaceId) {
    return NextResponse.json(
      { error: "Sign in again so the booking mailbox can send this email." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
    clientName?: string;
    brokerName?: string;
    title?: string;
    documents?: unknown;
    provideUrl?: string;
    dueDate?: string;
    notes?: string;
    brand?: {
      primary?: unknown;
      secondary?: unknown;
      gradient?: unknown;
      appName?: unknown;
    };
  };
  const to = String(body.to ?? "").trim().toLowerCase();
  const clientName = String(body.clientName ?? "").trim() || to.split("@")[0] || "Client";
  const documents = inviteDocuments(
    Array.isArray(body.documents)
      ? (body.documents as Array<string | { title?: string; description?: string }>)
      : [],
  );
  const provideUrl = String(body.provideUrl ?? "").trim();
  const brand = await workspaceEmailBrand(base, accessToken, body.brand);
  const built = provideUrl
    ? documentRequestInviteCopy({
        clientName,
        brokerName: String(body.brokerName ?? "").trim() || "your broker",
        title: String(body.title ?? "").trim(),
        documents,
        provideUrl,
        dueDate: String(body.dueDate ?? "").trim() || undefined,
        notes: String(body.notes ?? "").trim() || undefined,
        brand,
      })
    : null;
  const subject = built?.subject || String(body.subject ?? "").trim();
  const text = built?.text || String(body.text ?? "").trim();
  const html = built?.html || String(body.html ?? "").trim();
  if (!to.includes("@") || !subject || !text) {
    return NextResponse.json(
      { error: "A client email and message are required." },
      { status: 400 },
    );
  }

  const message = { to: [to], subject, text, html: html || undefined };
  try {
    const delivered = await deliverThroughPlatformMailer(message, accessToken);
    console.info("[document-invite] sent through the platform mailer");
    return NextResponse.json({ ok: true, delivered });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Could not send the email";
    console.error(
      `[document-invite] platform mailer did not send (${reason}); trying the booking mailbox`,
    );
  }

  let createdBookingId = "";
  try {
    const token = await guestMailToken(base, accessToken, workspaceId, to, clientName, (id) => {
      createdBookingId = id;
    });
    console.info(
      `[document-invite] sending through the booking mailbox (${createdBookingId ? "temporary booking" : "existing booking"})`,
    );
    const delivered = await deliverThroughBookingMailbox(message, token);
    // Leave a temporary booking in place after a successful send. Cancelling
    // it while the dev server is still running drops mail the mailbox has
    // not finished sending. It is cancelled below only when the send fails.
    createdBookingId = "";
    return NextResponse.json({ ok: true, delivered });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the email";
    console.error(`[document-invite] ${message}`);
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    if (createdBookingId) {
      await cancelCarrierBooking(base, accessToken, workspaceId, createdBookingId);
    }
  }
}

async function workspaceEmailBrand(
  base: string,
  accessToken: string,
  fallback: {
    primary?: unknown;
    secondary?: unknown;
    gradient?: unknown;
    appName?: unknown;
  } | undefined,
) {
  const posted = emailBrandFromValues(
    fallback
      ? {
          primaryColor: fallback.primary,
          secondaryColor: fallback.secondary,
          emailGradient: fallback.gradient,
          appName: fallback.appName,
        }
      : null,
  );
  try {
    const json = await crmGet(base, accessToken, "/v1/settings");
    const settings = normalizeCrmWorkspaceSettings(json);
    const remote = emailBrandFromSettings(settings);
    const savedGradient = settings.catalog?.["organization/branding"]?.emailGradient;
    if (fallback && savedGradient === undefined) {
      return { ...remote, gradient: posted.gradient };
    }
    return remote;
  } catch {
    return posted;
  }
}

async function guestMailToken(
  base: string,
  accessToken: string,
  workspaceId: string,
  email: string,
  clientName: string,
  onCreated: (bookingId: string) => void,
): Promise<string> {
  const list = await crmGet(
    base,
    accessToken,
    `/v1/workspaces/${workspaceId}/booking/bookings?limit=100`,
  );
  const existing = guestMailTokenFromBookings(list, email);
  if (existing) return existing;

  for (const id of bookingIdsForGuest(list, email).slice(0, 5)) {
    const detail = await crmGet(
      base,
      accessToken,
      `/v1/workspaces/${workspaceId}/booking/bookings/${encodeURIComponent(id)}`,
    );
    const token = guestMailTokenFromBookings(detail, email) ?? mailTokenFromCreated(detail);
    if (token) return token;
  }

  return mintPublicBooking(base, accessToken, workspaceId, email, clientName, onCreated);
}

const PUBLIC_SLUG = /^[a-z0-9][a-z0-9_-]{0,119}$/i;

/**
 * Booking confirmations are delivered with the cancel token from the public
 * book API. The staff booking API creates the appointment and does not return
 * that token, so mail sent from it never reaches the client.
 */
async function mintPublicBooking(
  base: string,
  accessToken: string,
  workspaceId: string,
  email: string,
  clientName: string,
  onCreated: (bookingId: string) => void,
): Promise<string> {
  const workspace = await crmGet(base, accessToken, `/v1/workspaces/${workspaceId}`);
  const workspaceSlug = firstSlug(workspace);
  if (!workspaceSlug) {
    throw new Error("No public booking page is available to send this email.");
  }
  const types = recordList(
    await crmGet(base, accessToken, `/v1/workspaces/${workspaceId}/booking/event-types`),
  );
  let lastError = "No public booking page is available to send this email.";
  for (const eventType of types.slice(0, 6)) {
    if (eventType.isPublic === false || eventType.isActive === false || eventType.active === false) {
      continue;
    }
    const eventTypeSlug = firstSlug(eventType);
    const eventTypeId = idOf(eventType);
    if (!eventTypeSlug || !eventTypeId) continue;
    const hosts = recordList(
      await crmGet(
        base,
        accessToken,
        `/v1/workspaces/${workspaceId}/booking/event-types/${encodeURIComponent(eventTypeId)}/hosts`,
      ).catch(() => null),
    );
    const host = hosts.find(
      (row) => firstSlug(row) && row.active !== false && row.isActive !== false,
    );
    const hostSlug = host ? firstSlug(host) : "";
    if (!hostSlug) continue;
    try {
      return await bookPublicSlot(base, accessToken, workspaceId, {
        workspaceSlug,
        hostSlug,
        eventTypeSlug,
        email,
        clientName,
        onCreated,
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
    }
  }
  throw new Error(lastError);
}

async function bookPublicSlot(
  base: string,
  accessToken: string,
  workspaceId: string,
  input: {
    workspaceSlug: string;
    hostSlug: string;
    eventTypeSlug: string;
    email: string;
    clientName: string;
    onCreated: (bookingId: string) => void;
  },
) {
  const from = new Date();
  const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
  const ref = {
    workspaceSlug: input.workspaceSlug,
    hostSlug: input.hostSlug,
    eventTypeSlug: input.eventTypeSlug,
  };
  const query = new URLSearchParams({
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    timezone: "Asia/Kathmandu",
  });
  const slots = await publicGet(base, `${publicBookingPath(ref, "/slots")}?${query.toString()}`);
  const slot = nextPublicSlot(slots);
  if (!slot) throw new Error("No open booking slot is available to send this email.");
  const startAt = new Date(slot.startAt).toISOString();
  const guest = {
    name: input.clientName.slice(0, 255) || "Client",
    email: input.email,
    startAt,
    timezone: "Asia/Kathmandu",
  };
  const hostId = slot.hostId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slot.hostId)
    ? slot.hostId
    : "";
  const path = publicBookingPath(ref, "/book");
  // Same body the public booking page sends. Extra fields are rejected as "Bad Request".
  let booked: unknown;
  try {
    booked = await publicBook(base, path, hostId ? { ...guest, hostId } : guest);
  } catch (error) {
    if (!hostId) throw error;
    booked = await publicBook(base, path, guest);
  }
  const token = mailTokenFromCreated(booked);
  const bookingId = firstId(booked);
  if (!token) {
    if (bookingId) await cancelCarrierBooking(base, accessToken, workspaceId, bookingId);
    throw new Error("The booking mailbox did not return a send token.");
  }
  if (bookingId) input.onCreated(bookingId);
  return token;
}

function nextPublicSlot(data: unknown): { startAt: string; hostId?: string } | null {
  let best: { startAt: string; hostId?: string } | null = null;
  for (const slots of parsePublicSlotDays(data).values()) {
    for (const slot of slots) {
      const at = Date.parse(slot.startAt);
      if (!Number.isFinite(at) || at <= Date.now()) continue;
      if (!best || slot.startAt < best.startAt) best = slot;
    }
  }
  return best;
}

async function publicGet(base: string, path: string) {
  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    console.error(`[document-invite] public slots ${res.status} ${text.slice(0, 500)}`);
    throw new Error(crmMessage(json, text.replace(/\s+/g, " ").trim().slice(0, 240) || `Request failed (${res.status})`));
  }
  if (json && typeof json === "object" && "data" in json) return (json as { data: unknown }).data;
  return json;
}

async function publicBook(base: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    console.error(`[document-invite] public book ${res.status} ${text.slice(0, 500)}`);
    throw new Error(crmMessage(json, text.replace(/\s+/g, " ").trim().slice(0, 240) || `Request failed (${res.status})`));
  }
  if (json && typeof json === "object" && "data" in json) return (json as { data: unknown }).data;
  return json;
}

async function cancelCarrierBooking(
  base: string,
  accessToken: string,
  workspaceId: string,
  bookingId: string,
) {
  await crmSend(
    base,
    accessToken,
    `/v1/workspaces/${workspaceId}/booking/bookings/${encodeURIComponent(bookingId)}/cancel`,
    { notifyInvitee: false },
  ).catch(() =>
    crmSend(
      base,
      accessToken,
      `/v1/workspaces/${workspaceId}/booking/bookings/${encodeURIComponent(bookingId)}/cancel`,
      {},
    ).catch(() => undefined),
  );
}

function unwrapRecord(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    return data.find((row) => row && typeof row === "object") as Record<string, unknown> | undefined ?? null;
  }
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  for (const key of ["data", "booking", "eventType"]) {
    const value = row[key];
    if (Array.isArray(value)) {
      const first = value.find((item) => item && typeof item === "object") as Record<string, unknown> | undefined;
      if (first) return first;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      if (
        typeof nested.id === "string" ||
        typeof nested.bookingId === "string" ||
        typeof nested.slug === "string"
      ) {
        return nested;
      }
    }
  }
  return row;
}

/**
 * The booking's id. The public book reply is the booking itself, with its
 * event type nested under `eventType`; that nested id must not be taken for it.
 */
function firstId(data: unknown): string {
  const own =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  if (own && (typeof own.cancelToken === "string" || typeof own.rescheduleToken === "string")) {
    const id = own.id ?? own.bookingId;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  const row = unwrapRecord(data);
  const id = row?.id ?? row?.bookingId ?? row?.eventTypeId;
  return typeof id === "string" ? id.trim() : "";
}

function firstSlug(data: unknown): string {
  const row = unwrapRecord(data) ?? recordList(data)[0];
  if (!row) return "";
  for (const key of ["slug", "workspaceSlug", "hostSlug", "eventTypeSlug"]) {
    const value = row[key];
    if (typeof value === "string" && PUBLIC_SLUG.test(value.trim())) return value.trim();
  }
  return "";
}

function idOf(row: Record<string, unknown>): string {
  const id = row.id ?? row.hostId ?? row.eventTypeId;
  return typeof id === "string" ? id.trim() : "";
}

function recordList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(
      (row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (!data || typeof data !== "object") return [];
  const row = data as Record<string, unknown>;
  for (const key of ["data", "items", "results", "eventTypes", "hosts", "records"]) {
    const value = row[key];
    if (Array.isArray(value)) return recordList(value);
    if (value && typeof value === "object") {
      const nested = recordList(value);
      if (nested.length) return nested;
    }
  }
  if (typeof row.id === "string" || typeof row.hostId === "string" || typeof row.slug === "string") {
    return [row];
  }
  return [];
}

async function crmGet(base: string, accessToken: string, path: string) {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(crmMessage(json, `CRM request failed (${res.status})`));
  }
  return json;
}

async function crmSend(
  base: string,
  accessToken: string,
  path: string,
  body: Record<string, unknown>,
) {
  return crmWrite(base, accessToken, path, "POST", body);
}

async function crmWrite(
  base: string,
  accessToken: string,
  path: string,
  method: "POST",
  body: Record<string, unknown>,
) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(crmMessage(json, `CRM request failed (${res.status})`));
  }
  return json;
}

function crmMessage(json: unknown, fallback: string) {
  if (!json || typeof json !== "object") return fallback;
  const message = (json as { message?: unknown }).message;
  const parts: string[] = [];
  if (Array.isArray(message)) {
    for (const row of message) {
      if (typeof row === "string" && row.trim() && row.trim() !== "Bad Request") parts.push(row.trim());
    }
  } else if (typeof message === "string" && message.trim() && message.trim() !== "Bad Request") {
    parts.push(message.trim());
  }
  return parts.join("; ") || fallback;
}
