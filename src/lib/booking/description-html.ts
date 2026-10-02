/**
 * The event type Description is rich text: bold, italic, underline, alignment,
 * lists and links. It is stored as HTML, so everything that saves or shows it
 * goes through here first. No DOM is needed, so it also runs while rendering on
 * the server.
 */

export type TextAlign = "left" | "center" | "right";

const LINK_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

function isWebHost(url: URL) {
  const host = url.hostname;
  // "https://hello" is not an address anyone can open; "localhost" and IPs are.
  return Boolean(host) && (host.includes(".") || host === "localhost" || host.includes(":"));
}

function webUrl(text: string): string | null {
  try {
    const url = new URL(text);
    return (url.protocol === "http:" || url.protocol === "https:") && isWebHost(url)
      ? text
      : null;
  } catch {
    return null;
  }
}

/** Spaces, control characters, and the characters that could break out of an attribute. */
function hasUnsafeCharacter(text: string) {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x20 || code === 0x7f || /\s/.test(char) || '<>"\\'.includes(char)) {
      return true;
    }
  }
  return false;
}

/**
 * What a typed link becomes, or null when it is not a link we will create.
 *
 * `google.com` → `https://google.com`, `me@site.com` → `mailto:me@site.com`.
 * Only web, email and phone links are allowed: `javascript:`, `data:` and the
 * like would run code for whoever clicks them.
 */
export function normalizeLinkUrl(input: string): string | null {
  const text = input.trim();
  if (!text || hasUnsafeCharacter(text)) return null;

  const scheme = text.match(/^([a-z][a-z0-9+.-]*):/i);
  // "localhost:3000" and "example.com:8080/x" look like a scheme but are hosts.
  const hostWithPort = /^[^\s/@:]+:\d+(?:[/?#]|$)/.test(text);
  if (scheme && !hostWithPort) {
    const protocol = `${scheme[1].toLowerCase()}:`;
    if (!LINK_PROTOCOLS.includes(protocol)) return null;
    const rest = text.slice(scheme[0].length);
    if (protocol === "mailto:") {
      return /^[^\s@]+@[^\s@]+\.[^\s@?]+/.test(rest) ? text : null;
    }
    if (protocol === "tel:") return /^\+?[\d().-]{3,}$/.test(rest) ? text : null;
    return webUrl(text);
  }

  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(text)) return `mailto:${text}`;
  if (text.startsWith("//")) return webUrl(`https:${text}`);
  return webUrl(`https://${text}`);
}

export function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(text: string) {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

/** A link as the editor writes it: opens in a new tab, without access to this page. */
export function buildLinkHtml(url: string, text: string) {
  return `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
}

/* -------------------------------------------------------------------------- */
/* Sanitizer                                                                   */
/* -------------------------------------------------------------------------- */

const ALLOWED_TAGS = new Set([
  "a", "b", "strong", "i", "em", "u", "br", "p", "div", "span", "ul", "ol", "li",
]);
const VOID_TAGS = new Set(["br"]);
// Tags that may carry text-align. Inline tags and <br> may not.
const ALIGNABLE = new Set(["p", "div", "span", "ul", "ol", "li"]);
// Everything inside these goes too, not just the tag.
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "svg", "math", "template",
  "noscript", "textarea", "title", "head", "xmp",
]);
// Bounds that keep one hostile description from costing more than it is worth.
const MAX_TAG_LENGTH = 4000;
const MAX_DEPTH = 200;
const ATTRIBUTE =
  /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", colon: ":", tab: "\t",
  newline: "\n", nbsp: "\u00a0", lpar: "(", rpar: ")", sol: "/", bsol: "\\",
};

function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : "";
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

function attributesOf(raw: string) {
  const found: Record<string, string> = {};
  for (const match of raw.matchAll(ATTRIBUTE)) {
    const name = match[1].toLowerCase();
    if (!(name in found)) {
      found[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
    }
  }
  return found;
}

function alignmentOf(attributes: Record<string, string>): string {
  const fromStyle = attributes.style?.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\b/i);
  const value = (fromStyle?.[1] ?? attributes.align ?? "").toLowerCase();
  return ["left", "center", "right", "justify"].includes(value) ? value : "";
}

function openingTag(tag: string, attributes: Record<string, string>) {
  if (tag === "a") {
    const href = attributes.href ? normalizeLinkUrl(attributes.href) : null;
    return href
      ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">`
      : "<a>";
  }
  const align = ALIGNABLE.has(tag) ? alignmentOf(attributes) : "";
  return align ? `<${tag} style="text-align:${align}">` : `<${tag}>`;
}

function isLetter(code: number) {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

type ReadTag = { end: number; closing: boolean; name: string; attributes: string };

/**
 * The tag starting at `start` (a "<"), or null when it is not a well-formed one.
 * Quoted values may contain ">".
 *
 * A tag that never ends would make a scan run to the end of the text, and a pile
 * of them would repeat that for every "<". So a scan looks at most MAX_TAG_LENGTH
 * characters ahead, and all scans of one description share `budget`: once it is
 * spent, a "<" is simply text. Real content uses a small fraction of it.
 */
function readTag(source: string, start: number, budget: { left: number }): ReadTag | null {
  if (budget.left <= 0) return null;
  let i = start + 1;
  const closing = source[i] === "/";
  if (closing) i += 1;
  const nameStart = i;
  if (!isLetter(source.charCodeAt(i))) {
    budget.left -= i - start;
    return null;
  }
  const limit = Math.min(source.length, start + MAX_TAG_LENGTH, start + budget.left);
  while (i < limit) {
    const code = source.charCodeAt(i);
    if (!isLetter(code) && !(code >= 48 && code <= 57) && code !== 45) break;
    i += 1;
  }
  const name = source.slice(nameStart, i).toLowerCase();
  const attributesStart = i;
  let quote = "";
  for (; i < limit; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      budget.left -= i + 1 - start;
      return { end: i + 1, closing, name, attributes: source.slice(attributesStart, i) };
    }
  }
  budget.left -= i - start;
  return null;
}

/**
 * Keeps what the editor can make (text styling, alignment, lists, links) and
 * drops the rest: scripts, event handlers, unknown tags and attributes, and any
 * link that is not web, email or phone.
 *
 * One pass: every character is looked at once, whatever the input.
 */
export function sanitizeDescriptionHtml(html: string): string {
  const out: string[] = [];
  const open: string[] = [];
  const budget = { left: html.length * 4 + 10_000 };
  let index = 0;

  while (index < html.length) {
    const lt = html.indexOf("<", index);
    if (lt === -1) {
      out.push(html.slice(index));
      break;
    }
    out.push(html.slice(index, lt));

    // Comments, <!DOCTYPE>, <?xml?>: gone. Left open, a browser reads them to the end.
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      index = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html[lt + 1] === "!" || html[lt + 1] === "?") {
      const end = html.indexOf(">", lt + 2);
      index = end === -1 ? html.length : end + 1;
      continue;
    }

    const tag = readTag(html, lt, budget);
    if (!tag) {
      // A "<" that does not start a tag is just text.
      out.push("&lt;");
      index = lt + 1;
      continue;
    }
    index = tag.end;

    if (DROP_WITH_CONTENT.has(tag.name)) {
      if (tag.closing) continue;
      // Skip to the matching close tag; if there is none, a browser would keep
      // treating the rest as that tag's content, so the rest goes too.
      const closer = new RegExp(`</${tag.name}(?![a-zA-Z0-9-])`, "gi");
      closer.lastIndex = index;
      const found = closer.exec(html);
      const close = found ? html.indexOf(">", found.index + found[0].length) : -1;
      index = close === -1 ? html.length : close + 1;
      continue;
    }
    if (!ALLOWED_TAGS.has(tag.name)) continue;

    if (tag.closing) {
      const position = open.lastIndexOf(tag.name);
      if (position === -1) continue;
      while (open.length > position) out.push(`</${open.pop()}>`);
    } else if (VOID_TAGS.has(tag.name)) {
      out.push(`<${tag.name}>`);
    } else if (open.length < MAX_DEPTH) {
      open.push(tag.name);
      out.push(openingTag(tag.name, attributesOf(tag.attributes)));
    }
  }
  while (open.length) out.push(`</${open.pop()}>`);
  return out.join("");
}

/** The visible text, for deciding whether a description is empty. */
function visibleText(html: string) {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/[\s\u00a0]+/g, " ").trim();
}

/**
 * What gets saved. An emptied editor leaves `<br>` or `<div><br></div>` behind,
 * which would show as a blank description instead of "—".
 */
export function cleanDescriptionHtml(html: string): string {
  const safe = sanitizeDescriptionHtml(html).trim();
  return visibleText(safe) ? safe : "";
}
