/** Digits plus common phone punctuation (+, spaces, dashes, parentheses, dots). */
const PHONE_CHARS = /^[+\d().\s-]+$/;

/** Normalize a stored phone to E.164, or undefined if it cannot be dialed. */
export function toE164(raw?: string): string | undefined {
  let compact = (raw ?? "").trim().replace(/[^\d+]/g, "");
  if (!compact) return undefined;
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (/^0\d{9}$/.test(compact)) compact = `+61${compact.slice(1)}`;
  if (/^61\d{8,10}$/.test(compact)) compact = `+${compact}`;
  if (/^[1-9]\d{8,14}$/.test(compact)) compact = `+${compact}`;
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) return undefined;
  return compact;
}

export function phoneNotDialableMessage(name: string) {
  const who = name.trim() || "This contact";
  return `${who} has no phone number in E.164 format (e.g. +61481549363).`;
}

export function requireDialablePhone(
  phone: string | undefined,
  name: string,
): { ok: true; e164: string } | { ok: false; message: string } {
  const trimmed = (phone ?? "").trim();
  if (!trimmed) {
    return {
      ok: false,
      message: `${name.trim() || "This contact"} has no phone number.`,
    };
  }
  const e164 = toE164(trimmed);
  if (!e164) {
    return { ok: false, message: phoneNotDialableMessage(name) };
  }
  return { ok: true, e164 };
}

export function phoneDigitCount(value: string) {
  return value.replace(/\D/g, "").length;
}

/**
 * Optional contact phone: empty is allowed; letters and other junk are not.
 * Formatting like +61 400 000 000 or (02) 1234 5678 is valid.
 */
export function isValidPhoneInput(value: string, required = false) {
  const trimmed = value.trim();
  if (!trimmed) return !required;
  if (!PHONE_CHARS.test(trimmed)) return false;
  return phoneDigitCount(trimmed) >= 8;
}

/** Empty is fine; otherwise a user-facing error if the value is not a phone. */
export function optionalPhoneError(value: string) {
  if (isValidPhoneInput(value)) return undefined;
  return "Enter a valid phone number";
}
