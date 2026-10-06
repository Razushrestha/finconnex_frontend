import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { BookingPage } from "@/lib/booking/types";
import { bookingSlugKey } from "@/lib/booking/types";

/**
 * Guest links like `/book/day-test` are served by this app. The CRM has no
 * `published-pages` resource: PUT, POST, and GET of that path all 404 with
 * "Cannot PUT ...". The page is stored on this server. Booking into the CRM
 * still uses the public event-type address stored on `crmPublic`.
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

export async function writePublicBookingPage(page: BookingPage): Promise<string | null> {
  const key = bookingSlugKey(page.slug) || bookingSlugKey(page.title);
  if (!key) return "Missing slug";
  const live: BookingPage = { ...page, status: "Live" };
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
  const stored = cached?.page ?? (await readTempCopy(key));
  if (stored) memory.set(key, { at: Date.now(), page: stored });
  return stored;
}
