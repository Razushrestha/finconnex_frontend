const STORE_KEY = "booking:short-links:v1";
const ONCE_KEY = "booking:once-links:v1";

function readMap(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, string>) {
  sessionStorage.setItem(key, JSON.stringify(map));
}

export function saveShortLink(code: string, targetPath: string) {
  const map = readMap(STORE_KEY);
  map[code] = targetPath;
  writeMap(STORE_KEY, map);
}

export function resolveShortLink(code: string): string | null {
  return readMap(STORE_KEY)[code] ?? null;
}

export function saveOnceLink(code: string, targetPath: string) {
  const map = readMap(ONCE_KEY);
  map[code] = targetPath;
  writeMap(ONCE_KEY, map);
}

export function consumeOnceLink(code: string): string | null {
  const map = readMap(ONCE_KEY);
  const target = map[code];
  if (!target) return null;
  delete map[code];
  writeMap(ONCE_KEY, map);
  return target;
}
