import { TOP_LEVEL_DOMAINS } from "@/lib/emails/tlds";

/**
 * Same shape the CRM backend accepts (`class-validator` `isEmail`):
 * local-part @ domain with at least one dot. Not a full RFC parser.
 */
export function isEmailAddress(value: string): boolean {
  const address = value.trim();
  if (!address || /\s/.test(address)) return false;
  return /^[^@]+@[^@.]+(\.[^@.]+)+$/.test(address);
}

export function splitEmailTokens(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function partitionEmailAddresses(raw: string | string[]): {
  valid: string[];
  invalid: string[];
} {
  const tokens = Array.isArray(raw) ? raw.flatMap(splitEmailTokens) : splitEmailTokens(raw);
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    if (isEmailAddress(token)) {
      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      valid.push(token);
    } else {
      invalid.push(token);
    }
  }
  return { valid, invalid };
}

export function invalidEmailMessage(invalid: string[]): string | undefined {
  if (!invalid.length) return undefined;
  const sample = invalid[0]!;
  return `"${sample}" is not a valid email address. Use name@domain.com.`;
}

/** Big mailbox providers, to catch a mistyped ending like gmail.comcomcom. */
const COMMON_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "proton.me",
  "bigpond.com",
];

const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

/**
 * The address the user most likely meant, when the domain is a common
 * provider with extra characters after it ("ram@gmail.comcomcom" →
 * "ram@gmail.com"). Null when there is nothing to suggest.
 */
export function emailAddressSuggestion(value: string): string | null {
  const address = value.trim();
  const at = address.lastIndexOf("@");
  if (at <= 0) return null;
  const domain = address.slice(at + 1).toLowerCase();
  const near = COMMON_DOMAINS.find(
    (known) => domain !== known && domain.startsWith(known) && domain.length > known.length,
  );
  return near ? `${address.slice(0, at)}@${near}` : null;
}

/**
 * Why an email address cannot be used, or null when it looks deliverable.
 *
 * Stricter than isEmailAddress: the domain's ending must be a real
 * top-level domain (IANA's list), each part of the domain must be well
 * formed, and a near miss on a common provider gets a suggestion — so
 * "ram@gmail.comcomcom" answers "Did you mean ram@gmail.com?".
 */
export function emailAddressProblem(value: string): string | null {
  const address = value.trim();
  if (!address) return "Enter an email address.";
  if (/\s/.test(address)) return "An email address cannot contain spaces.";
  const at = address.lastIndexOf("@");
  if (at <= 0 || at === address.length - 1 || address.indexOf("@") !== at) {
    return "Enter an email address like name@example.com.";
  }
  const local = address.slice(0, at);
  const domain = address.slice(at + 1).toLowerCase();
  if (local.length > 64 || !LOCAL_PART.test(local)) {
    return "The part before @ has characters an email address cannot use.";
  }
  const labels = domain.split(".");
  if (labels.length < 2 || domain.length > 253 || !labels.every((label) => DOMAIN_LABEL.test(label))) {
    return "Enter an email address like name@example.com.";
  }
  const suggestion = emailAddressSuggestion(address);
  if (suggestion) return `Did you mean ${suggestion}?`;
  const ending = labels[labels.length - 1];
  if (!TOP_LEVEL_DOMAINS.has(ending)) {
    return `“.${ending}” is not a real email domain ending. Check the address.`;
  }
  return null;
}
