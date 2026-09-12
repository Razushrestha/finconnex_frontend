/**
 * Recipients for a SEND_EMAIL step.
 *
 * The wire shape is `CreateEmailDto`'s: one `toEmail`, and `cc` / `bcc` as
 * **comma-separated strings** (not arrays). The backend's
 * `normalizeRecipients` lowercases every address, rejects anything that is
 * not an address, drops duplicates across all three fields, insists on
 * exactly one `to`, and caps the deduped total at 50 — so the builder applies
 * the same rules rather than letting a step save and fail at send time.
 *
 * `toEmail` left unset means "the record that triggered this run" — the
 * automation executor resolves the triggering lead's or contact's own address
 * (`AutomationActionService.emailRecipient`). Only those two entity types
 * carry an address of their own.
 */
import type { AutomationEntityType } from "@/lib/automations/types";

/** Mirrors `seen.size > 50` in EmailService.normalizeRecipients. */
export const MAX_EMAIL_RECIPIENTS = 50;

/**
 * Entity types whose record has an email column the executor can read. A
 * company or deal has none — its people hang off relations — so a step on one
 * of those has to name an address.
 */
export const TRIGGER_EMAIL_ENTITY_TYPES = [
  "LEAD",
  "CONTACT",
] as const satisfies readonly AutomationEntityType[];

export function supportsTriggerEmail(entityType: AutomationEntityType): boolean {
  return (TRIGGER_EMAIL_ENTITY_TYPES as readonly string[]).includes(entityType);
}

/**
 * Placeholders the builder advertised before anything resolved them. Read as
 * "the trigger's address" so an older step opens on the default instead of
 * showing a token in the address box; saving rewrites it as absence.
 */
const TRIGGER_EMAIL_TOKENS = new Set(["{{email}}", "{{trigger.email}}"]);

export function isTriggerEmailToken(value: unknown): boolean {
  return (
    typeof value === "string" &&
    TRIGGER_EMAIL_TOKENS.has(value.trim().toLowerCase())
  );
}

/**
 * Deliberately the same shape the backend accepts (`class-validator`'s
 * `isEmail`), not a stricter one: rejecting an address the API would have
 * taken is its own kind of bug.
 */
export function isEmailAddress(value: string): boolean {
  const address = value.trim();
  if (!address || /\s/.test(address)) return false;
  return /^[^@]+@[^@.]+(\.[^@.]+)+$/.test(address);
}

/** A stored `cc` / `bcc` string as a list, deduped case-insensitively. */
export function parseRecipients(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of value.split(",")) {
    const address = raw.trim();
    if (!address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(address);
  }
  return list;
}

/** Back to the wire string. `undefined` — never "" — when nothing is set. */
export function serializeRecipients(list: string[]): string | undefined {
  const joined = parseRecipients(list.join(","));
  return joined.length ? joined.join(",") : undefined;
}

export type EmailRecipients = {
  /** Unset means "the triggering record's own address". */
  toEmail?: string;
  cc: string[];
  bcc: string[];
};

/** Stands in for the address the executor resolves at run time. */
const UNRESOLVED_TRIGGER_ADDRESS = "trigger-record";

/**
 * How many mailboxes this step addresses, counted the way the backend counts
 * them: one set, case-insensitive, across to + cc + bcc. An unresolved
 * trigger address counts as one, since that is what it becomes.
 */
export function recipientCount(recipients: EmailRecipients): number {
  const seen = new Set<string>();
  const add = (address: string) => {
    const key = address.trim().toLowerCase();
    if (key) seen.add(key);
  };
  recipients.cc.forEach(add);
  recipients.bcc.forEach(add);
  add(recipients.toEmail ?? UNRESOLVED_TRIGGER_ADDRESS);
  return seen.size;
}

/**
 * Read a step's config into the fields the panel edits.
 *
 * An **empty** `toEmail` is kept as `""`, not folded into `undefined`: the two
 * mean different things here — "a specific address, not typed yet" versus
 * "the trigger record's address" — and collapsing them would make the choice
 * flip back to the default as soon as the address box is cleared.
 */
export function readEmailRecipients(
  config: Record<string, unknown>,
): EmailRecipients {
  const to = config.toEmail;
  return {
    toEmail:
      typeof to === "string" && !isTriggerEmailToken(to) ? to : undefined,
    cc: parseRecipients(config.cc),
    bcc: parseRecipients(config.bcc),
  };
}

/**
 * Back into the step config, dropping each key that carries nothing — the
 * action registry rejects an unknown key, and an empty string would fail
 * `@IsEmail()` where the key is simply absent instead.
 */
export function writeEmailRecipients(
  config: Record<string, unknown>,
  recipients: EmailRecipients,
): Record<string, unknown> {
  const next = { ...config };
  const set = (key: "cc" | "bcc", value: string | undefined) => {
    if (value) next[key] = value;
    else delete next[key];
  };
  // `""` survives here on purpose (see readEmailRecipients); the panel blocks
  // Save while it is empty, so it never reaches the API.
  if (recipients.toEmail === undefined) delete next.toEmail;
  else next.toEmail = recipients.toEmail;
  set("cc", serializeRecipients(recipients.cc));
  set("bcc", serializeRecipients(recipients.bcc));
  return next;
}

/**
 * What stops this step from saving. Empty means it will be accepted — by the
 * builder, by the action registry, and by the email service at send time.
 */
export function emailRecipientProblems(
  recipients: EmailRecipients,
  entityType: AutomationEntityType,
  entityNoun = "record",
): string[] {
  const problems: string[] = [];
  if (recipients.toEmail === undefined) {
    if (!supportsTriggerEmail(entityType)) {
      problems.push(
        `A ${entityNoun} has no email address of its own — enter a specific address to send to.`,
      );
    }
  } else if (!isEmailAddress(recipients.toEmail)) {
    problems.push("Enter a valid To address.");
  }
  const invalid = [...recipients.cc, ...recipients.bcc].find(
    (address) => !isEmailAddress(address),
  );
  if (invalid) problems.push(`"${invalid}" is not a valid email address.`);
  if (recipientCount(recipients) > MAX_EMAIL_RECIPIENTS) {
    problems.push(`One email reaches at most ${MAX_EMAIL_RECIPIENTS} recipients.`);
  }
  return problems;
}
