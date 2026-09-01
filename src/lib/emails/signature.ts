import { listFromIdentities } from "@/lib/emails/send-as";

const LEGACY_KEY = "finconnex.email.signature.v1";
const ACTIVE_KEY = "finconnex.email.signature.active.v1";
const MAP_KEY = "finconnex.email.signatures.map.v1";

export interface SignatureProfile {
  id: string;
  name: string;
  email: string;
  body: string;
}

export const DEFAULT_SIGNATURE = `John Smith
Senior Mortgage Broker | FinConnex
john.smith@finconnex.com
+61 400 000 000`;

const BUILTIN: SignatureProfile[] = [
  {
    id: "own",
    name: "Bishnu",
    email: "bishnu@nepatronix.com",
    body: `Bishnu
Mortgage Broker | FinConnex
bishnu@nepatronix.com
+61 400 000 000`,
  },
  {
    id: "john",
    name: "John Smith",
    email: "john.smith@finconnex.com",
    body: DEFAULT_SIGNATURE,
  },
  {
    id: "loans",
    name: "FinConnex Loans",
    email: "loans@finconnex.com",
    body: `FinConnex Loans
loans@finconnex.com
www.finconnex.com.au
Level 3, Suite 23 / 301 Castlereagh St, Sydney NSW 2000`,
  },
];

function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  try {
    localStorage.setItem(MAP_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function listSignatureProfiles(): SignatureProfile[] {
  const map = readMap();
  const identities = listFromIdentities();
  const extras = identities
    .filter(
      (item) =>
        !BUILTIN.some((profile) => profile.email.toLowerCase() === item.email.toLowerCase()),
    )
    .map((item) => ({
      id: item.email,
      name: item.name,
      email: item.email,
      body: `${item.name}\n${item.email}`,
    }));
  return [...BUILTIN, ...extras].map((profile) => ({
    ...profile,
    body: map[profile.email] || profile.body,
  }));
}

export function getActiveSignatureId() {
  if (typeof window === "undefined") return "own";
  try {
    return localStorage.getItem(ACTIVE_KEY) || "own";
  } catch {
    return "own";
  }
}

export function setActiveSignatureId(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function getActiveSignatureProfile() {
  const profiles = listSignatureProfiles();
  const id = getActiveSignatureId();
  return profiles.find((item) => item.id === id) ?? profiles[0]!;
}

export function loadSignature() {
  if (typeof window === "undefined") return DEFAULT_SIGNATURE;
  const active = getActiveSignatureProfile();
  if (active?.body) return active.body;
  try {
    return localStorage.getItem(LEGACY_KEY) || DEFAULT_SIGNATURE;
  } catch {
    return DEFAULT_SIGNATURE;
  }
}

export function saveSignature(value: string) {
  const active = getActiveSignatureProfile();
  const map = readMap();
  map[active.email] = value;
  writeMap(map);
  try {
    localStorage.setItem(LEGACY_KEY, value);
  } catch {
    /* ignore */
  }
}

export function saveSignatureFor(email: string, value: string) {
  const map = readMap();
  map[email] = value;
  writeMap(map);
}

export function signatureToHtml(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  return `<p>${lines.map((line) => escapeHtml(line)).join("<br>")}</p>`;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function signatureMarker(signature: string) {
  return signature.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
}

export function bodyContainsSignature(html: string, signature: string) {
  const marker = signatureMarker(signature);
  return Boolean(marker && html.includes(marker));
}

export function hasAnySignature(html: string) {
  return (
    listSignatureProfiles().some((profile) => bodyContainsSignature(html, profile.body)) ||
    bodyContainsSignature(html, DEFAULT_SIGNATURE)
  );
}

export function swapSignature(html: string, fromBody: string, toBody: string) {
  return appendSignature(stripSignature(html, fromBody), toBody);
}

export function stripSignature(html: string, signature: string) {
  const block = signatureToHtml(signature);
  if (!block || !html.includes(block)) {
    const marker = signatureMarker(signature);
    if (!marker || !html.includes(marker)) return html;
    return html.replace(
      new RegExp(`<p>[^<]*${escapeRegExp(marker)}[\\s\\S]*?</p>`, "i"),
      "",
    );
  }
  return html.replace(block, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function appendSignature(html: string, signature: string) {
  const block = signatureToHtml(signature);
  if (!block) return html;
  if (bodyContainsSignature(html, signature)) return html;
  const prefix = html.trim() ? html : "<p></p><p></p>";
  return `${prefix}<p></p>${block}`;
}

export function stripAllSignatures(html: string) {
  let next = html;
  for (const profile of listSignatureProfiles()) {
    next = stripSignature(next, profile.body);
  }
  next = stripSignature(next, DEFAULT_SIGNATURE);
  return next.replace(/(<p><\/p>\s*)+$/g, "").trim();
}

export function replaceSignatureInHtml(html: string, nextSignature: string) {
  return appendSignature(stripAllSignatures(html), nextSignature);
}

export function getSignatureProfileForEmail(email: string) {
  const profiles = listSignatureProfiles();
  return (
    profiles.find((item) => item.email.toLowerCase() === email.toLowerCase()) ??
    getActiveSignatureProfile()
  );
}

export function applyPersonaSignature(html: string, email: string) {
  const profile = getSignatureProfileForEmail(email);
  setActiveSignatureId(profile.id);
  return replaceSignatureInHtml(html, profile.body);
}
