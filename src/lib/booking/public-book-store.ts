import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { crmBaseUrl, decodeJwtPayload, resolveLiveCrmAuth } from "@/lib/auth/crm-server";
import type { BookingPage } from "@/lib/booking/types";
import { bookingSlugKey } from "@/lib/booking/types";

/**
 * Published booking pages live in the CRM (`published_booking_pages`), so
 * every server instance and every redeploy serves the same page. A server's
 * temp folder used to be the only copy, which other instances could not see —
 * a guest's request landing on one of those got "not connected to the CRM".
 * The temp copy is kept only as a fallback for when the CRM is unreachable.
 */

const MEMORY_TTL_MS = 30_000;
const memory = new Map<string, { at: number; page: BookingPage }>();

function storeDir() {
  return path.join(tmpdir(), "crmaus-public-book");
}

function fileFor(slug: string) {
  return path.join(storeDir(), `${bookingSlugKey(slug) || "page"}.json`);
}

async function readTempCopy(key: string): Promise<BookingPage | null> {
  try {
    const page = JSON.parse(await readFile(fileFor(key), "utf8")) as BookingPage;
    return page?.slug ? page : null;
  } catch {
    return null;
  }
}

async function writeTempCopy(key: string, page: BookingPage) {
  try {
    await mkdir(storeDir(), { recursive: true });
    await writeFile(fileFor(key), JSON.stringify(page), "utf8");
  } catch {
    /* tmp may be read-only */
  }
}

type CrmLookup = { found: BookingPage } | { missing: true } | { unreachable: true };

async function readFromCrm(key: string): Promise<CrmLookup> {
  const base = crmBaseUrl();
  if (!base) return { unreachable: true };
  try {
    const res = await fetch(`${base}/v1/public/booking/pages/${encodeURIComponent(key)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (res.status === 404) return { missing: true };
    if (!res.ok) return { unreachable: true };
    const json = (await res.json().catch(() => null)) as { data?: unknown } | null;
    const page = (json && typeof json === "object" && "data" in json ? json.data : json) as
      | BookingPage
      | null;
    return page && typeof page === "object" ? { found: page } : { missing: true };
  } catch {
    return { unreachable: true };
  }
}

/** Saves the page in the CRM; returns the CRM's refusal message, if any. */
async function writeToCrm(key: string, page: BookingPage): Promise<string | null> {
  const base = crmBaseUrl();
  const auth = await resolveLiveCrmAuth().catch(() => null);
  const token = auth?.accessToken;
  const workspaceId = token ? decodeJwtPayload(token)?.workspaceId : null;
  if (!base || !token || typeof workspaceId !== "string" || !workspaceId) {
    return "Sign in again to publish this booking page.";
  }
  try {
    const res = await fetch(
      `${base}/v1/workspaces/${workspaceId}/booking/published-pages/${encodeURIComponent(key)}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ page }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (res.ok) return null;
    const json = (await res.json().catch(() => null)) as { message?: unknown } | null;
    return typeof json?.message === "string" && json.message
      ? json.message
      : `Could not publish the booking page (${res.status})`;
  } catch {
    return "The CRM could not be reached to publish this booking page.";
  }
}

export async function writePublicBookingPage(page: BookingPage): Promise<string | null> {
  const key = bookingSlugKey(page.slug) || bookingSlugKey(page.title);
  if (!key) return "Missing slug";
  const live: BookingPage = { ...page, status: "Live" };
  const refused = await writeToCrm(key, live);
  if (!refused) memory.set(key, { at: Date.now(), page: live });
  await writeTempCopy(key, live);
  return refused;
}

export async function readPublicBookingPage(
  slug: string,
): Promise<BookingPage | null> {
  const key = bookingSlugKey(slug);
  if (!key) return null;
  const cached = memory.get(key);
  if (cached && Date.now() - cached.at < MEMORY_TTL_MS) return cached.page;

  const crm = await readFromCrm(key);
  if ("found" in crm) {
    memory.set(key, { at: Date.now(), page: crm.found });
    return crm.found;
  }
  // Not in the CRM (a page published before it stored them) or the CRM is
  // unreachable: fall back to this server's last copy.
  return cached?.page ?? (await readTempCopy(key));
}
