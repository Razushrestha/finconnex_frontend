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
