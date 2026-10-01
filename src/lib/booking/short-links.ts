const STORE_KEY = "booking:short-links:v1";
const ONCE_KEY = "booking:once-links:v1";

function readMap(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const fromLocal = window.localStorage.getItem(key);
    const fromSession = window.sessionStorage.getItem(key);
    const local = fromLocal ? (JSON.parse(fromLocal) as Record<string, string>) : {};
    const session = fromSession
      ? (JSON.parse(fromSession) as Record<string, string>)
      : {};
    return { ...session, ...local };
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, string>) {
  window.localStorage.setItem(key, JSON.stringify(map));
}

export function saveShortLink(code: string, targetPath: string) {
  const map = readMap(STORE_KEY);
  map[code] = targetPath;
  writeMap(STORE_KEY, map);
}

export function resolveShortLink(code: string): string | null {
  return readMap(STORE_KEY)[code] ?? null;
}

type OnceEntry = { target: string; openedAt?: number };

const ONCE_GRACE_MS = 60_000;

function readOnceMap(): Record<string, OnceEntry> {
  const raw = readMap(ONCE_KEY) as Record<string, string | OnceEntry>;
  const map: Record<string, OnceEntry> = {};
  for (const [code, value] of Object.entries(raw)) {
    if (typeof value === "string") map[code] = { target: value };
    else if (value && typeof value.target === "string") map[code] = value;
  }
  return map;
}

function writeOnceMap(map: Record<string, OnceEntry>) {
  window.localStorage.setItem(ONCE_KEY, JSON.stringify(map));
}

export function saveOnceLink(code: string, targetPath: string) {
  const map = readOnceMap();
  map[code] = { target: targetPath };
  writeOnceMap(map);
}

export function consumeOnceLink(code: string): string | null {
  const map = readOnceMap();
  const row = map[code];
  if (!row?.target.startsWith("/book/")) return null;
  const now = Date.now();
  if (row.openedAt && now - row.openedAt > ONCE_GRACE_MS) {
    delete map[code];
    writeOnceMap(map);
    return null;
  }
  if (!row.openedAt) {
    map[code] = { ...row, openedAt: now };
    writeOnceMap(map);
  }
  return row.target;
}

async function publishShortLink(code: string, targetPath: string, once: boolean) {
  const res = await fetch("/api/book/short", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, target: targetPath, once }),
  });
  if (res.ok) return;
  let message = "Could not create the short link";
  try {
    const json = (await res.json()) as { error?: string };
    if (json.error) message = json.error;
  } catch {
    /* keep default */
  }
  throw new Error(message);
}

/** Save on this browser and on the server so the link works in any tab. */
export async function publishBookingShortLink(code: string, targetPath: string) {
  saveShortLink(code, targetPath);
  await publishShortLink(code, targetPath, false);
}

export async function publishBookingOnceLink(code: string, targetPath: string) {
  saveOnceLink(code, targetPath);
  await publishShortLink(code, targetPath, true);
}
