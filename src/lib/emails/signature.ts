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

/**
 * Blank by default. This was a hardcoded demo signature for a fabricated
 * broker; a real one is composed per user in email settings.
 */
export const DEFAULT_SIGNATURE = "";

/**
 * Built-in signature profiles came from demo identities; real profiles are
 * created by the user in email settings.
 */
const BUILTIN: SignatureProfile[] = [];

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

export function getActiveSignatureProfile(): SignatureProfile | undefined {
  const profiles = listSignatureProfiles();
  const id = getActiveSignatureId();
  return profiles.find((item) => item.id === id) ?? profiles[0];
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
  if (active?.email) map[active.email] = value;
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
    /data-email-signature="/i.test(html) ||
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

export function stripUploadedSignatureBlocks(html: string) {
  return html.replace(
    /<p[^>]*data-email-signature="[^"]*"[^>]*>[\s\S]*?<\/p>/gi,
    "",
  );
}

const UPLOADED_SIGNATURE_IMG_STYLE =
  "display:block;width:80%;max-width:80%;height:auto;";

export function enlargeUploadedSignatureImages(html: string) {
  if (!html.includes("data-email-signature")) return html;
  return html.replace(
    /(<p\b[^>]*\bdata-email-signature="[^"]*"[^>]*>)([\s\S]*?)(<\/p>)/gi,
    (_match, open: string, inner: string, close: string) => {
      const sized = inner.replace(/<img\b([^>]*?)\/?>/gi, (_img, attrs: string) => {
        if (attrs.includes(UPLOADED_SIGNATURE_IMG_STYLE)) {
          return `<img${attrs}>`;
        }
        const rest = attrs.replace(/\sstyle="[^"]*"/gi, "");
        return `<img${rest} style="${UPLOADED_SIGNATURE_IMG_STYLE}">`;
      });
      return `${open}${sized}${close}`;
    },
  );
}

export function uploadedSignatureHtml(id: string, src: string, name: string) {
  const alt = escapeHtml(name || "Signature");
  return `<p data-email-signature="${escapeHtml(id)}"><img src="${src}" alt="${alt}" style="${UPLOADED_SIGNATURE_IMG_STYLE}" /></p>`;
}

export function stripAllSignatures(html: string) {
  let next = stripUploadedSignatureBlocks(html);
  for (const profile of listSignatureProfiles()) {
    next = stripSignature(next, profile.body);
  }
  next = stripSignature(next, DEFAULT_SIGNATURE);
  return next.replace(/(<p><\/p>\s*)+$/g, "").trim();
}

export function replaceSignatureInHtml(html: string, nextSignature: string) {
  return appendSignature(stripAllSignatures(html), nextSignature);
}

export function insertUploadedSignature(
  html: string,
  id: string,
  src: string,
  name: string,
) {
  const stripped = stripAllSignatures(html);
  const prefix = stripped.trim() ? stripped : "<p></p>";
  return `${prefix}<p></p>${uploadedSignatureHtml(id, src, name)}`;
}

export function getSignatureProfileForEmail(email: string) {
  const profiles = listSignatureProfiles();
  const key = email.trim().toLowerCase();
  return (
    profiles.find((item) => item.email.toLowerCase() === key) ??
    getActiveSignatureProfile()
  );
}

export function applyPersonaSignature(html: string, email: string) {
  const profile = getSignatureProfileForEmail(email);
  if (!profile) return html;
  setActiveSignatureId(profile.id);
  return replaceSignatureInHtml(html, profile.body);
}
