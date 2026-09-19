import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { BookingPage } from "@/lib/booking/types";
import { bookingSlugKey } from "@/lib/booking/types";

const memory = new Map<string, BookingPage>();

function storeDir() {
  return path.join(tmpdir(), "crmaus-public-book");
}

function fileFor(slug: string) {
  return path.join(storeDir(), `${bookingSlugKey(slug) || "page"}.json`);
}

export async function writePublicBookingPage(page: BookingPage) {
  const key = bookingSlugKey(page.slug) || bookingSlugKey(page.title);
  if (!key) return;
  const live: BookingPage = { ...page, status: "Live" };
  memory.set(key, live);
  try {
    await mkdir(storeDir(), { recursive: true });
    await writeFile(fileFor(key), JSON.stringify(live), "utf8");
  } catch {
    /* tmp may be read-only */
  }
}

export async function readPublicBookingPage(
  slug: string,
): Promise<BookingPage | null> {
  const key = bookingSlugKey(slug);
  if (!key) return null;
  const cached = memory.get(key);
  if (cached) return cached;
  try {
    const raw = await readFile(fileFor(key), "utf8");
    const page = JSON.parse(raw) as BookingPage;
    if (page?.slug) {
      memory.set(key, page);
      return page;
    }
  } catch {
    return null;
  }
  return null;
}
