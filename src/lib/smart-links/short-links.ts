const STORE_KEY = "smart-links:shorts:v1";

export type SmartShortLink = {
  id: string;
  alias: string;
  destination: string;
  clicks: number;
  createdAt: string;
};

function readList(): SmartShortLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SmartShortLink[]) : [];
  } catch {
    return [];
  }
}

function writeList(list: SmartShortLink[]) {
  window.localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listSmartShortLinks(): SmartShortLink[] {
  return readList();
}

export function findSmartShortLink(alias: string): SmartShortLink | null {
  const key = alias.trim().toLowerCase();
  return readList().find((row) => row.alias === key) ?? null;
}

export function normalizeDestinationUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function slugifyAlias(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function randomAlias(len = 7): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export function createSmartShortLink(input: {
  destination: string;
  alias?: string;
}): SmartShortLink {
  const destination = normalizeDestinationUrl(input.destination);
  if (!destination) {
    throw new Error("Enter a valid destination URL");
  }
  const requested = input.alias?.trim() ? slugifyAlias(input.alias) : "";
  const list = readList();
  let alias = requested || randomAlias();
  if (requested && list.some((row) => row.alias === requested)) {
    throw new Error("That short name is already in use");
  }
  while (!requested && list.some((row) => row.alias === alias)) {
    alias = randomAlias();
  }
  const row: SmartShortLink = {
    id: `sl-${Date.now()}`,
    alias,
    destination,
    clicks: 0,
    createdAt: new Date().toISOString(),
  };
  writeList([row, ...list]);
  return row;
}

export function recordSmartShortClick(alias: string): string | null {
  const key = alias.trim().toLowerCase();
  const list = readList();
  const index = list.findIndex((row) => row.alias === key);
  if (index < 0) return null;
  const row = list[index];
  list[index] = { ...row, clicks: row.clicks + 1 };
  writeList(list);
  return row.destination;
}

export function smartShortPath(alias: string) {
  return `/go/${alias}`;
}

export function qrImageUrl(data: string, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}
