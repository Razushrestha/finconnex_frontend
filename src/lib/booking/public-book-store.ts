import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { crmBaseUrl, decodeJwtPayload, resolveLiveCrmAuth } from "@/lib/auth/crm-server";
import type { BookingPage } from "@/lib/booking/types";
import { bookingSlugKey } from "@/lib/booking/types";

/**
 * Published booking pages are saved in the CRM (`published_booking_pages`) so
 * every server instance and every redeploy serves the same page; a server's
 * temp folder, the only copy before, is invisible to other instances, and a
 * guest's request landing on one of those got "not connected to the CRM".
 *
 * The temp copy is still written and read as a fallback, so publishing keeps
 * working while the CRM is unreachable or not yet deployed with the
 * published-pages route (it answers 404 "Cannot PUT" until then).
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

/**
 * Saves the page in the CRM. Returns a message only for a refusal the host
 * must act on (the link belongs to another workspace, or the page is too
 * large); anything else leaves the temp copy serving the page.
 */
async function writeToCrm(key: string, page: BookingPage): Promise<string | null> {
  const base = crmBaseUrl();
  const auth = await resolveLiveCrmAuth().catch(() => null);
  const token = auth?.accessToken;
  const workspaceId = token ? decodeJwtPayload(token)?.workspaceId : null;
  if (!base || !token || typeof workspaceId !== "string" || !workspaceId) {
    console.warn("[book/publish] no CRM session; kept the server copy only");
    return null;
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
    const message = typeof json?.message === "string" ? json.message : "";
    if (res.status === 409 || res.status === 413) {
      return message || "This booking page could not be published.";
    }
    console.warn(`[book/publish] CRM answered ${res.status}; kept the server copy only`, message);
    return null;
  } catch (err) {
    console.warn("[book/publish] CRM unreachable; kept the server copy only", err);
    return null;
  }
}

export async function writePublicBookingPage(page: BookingPage): Promise<string | null> {
  const key = bookingSlugKey(page.slug) || bookingSlugKey(page.title);
  if (!key) return "Missing slug";
  const live: BookingPage = { ...page, status: "Live" };
  const refused = await writeToCrm(key, live);
  if (refused) return refused;
  memory.set(key, { at: Date.now(), page: live });
  await writeTempCopy(key, live);
  return null;
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
  // Not in the CRM (published before it stored pages, or the CRM has no
  // published-pages route yet) or unreachable: use this server's copy.
  const stored = cached?.page ?? (await readTempCopy(key));
  if (stored) memory.set(key, { at: Date.now(), page: stored });
  return stored;
}
