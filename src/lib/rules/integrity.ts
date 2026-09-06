/** SRS §28.1 Data Integrity: uniqueness derived from live module stores */

import { listContactEmails } from "@/lib/contacts/store";
import { listDealKeys } from "@/lib/deals/store";
import { listLeadEmails } from "@/lib/leads/store";
import {
  humanizeFieldKey,
} from "@/lib/rules/storage";
import { fail, ok, SYSTEM_FIELDS, type RuleResult } from "@/lib/rules/types";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function dealKey(name: string, account: string) {
  return `${name.trim().toLowerCase()}::${account.trim().toLowerCase()}`;
}

/** Emails already used on Leads. */
export function listClaimedLeadEmails(): string[] {
  return [...new Set(listLeadEmails().map(normalizeEmail))];
}

/** Emails already used on Contacts. */
export function listClaimedContactEmails(): string[] {
  return [...new Set(listContactEmails().map(normalizeEmail))];
}

/** Live emails across Leads + Contacts (seed + created). */
export function listClaimedEmails(): string[] {
  return [
    ...new Set([...listClaimedLeadEmails(), ...listClaimedContactEmails()]),
  ];
}

/** Live Deal Name + Account keys. */
export function listClaimedDealKeys(): string[] {
  return [...new Set(listDealKeys())];
}

export type UniqueEmailScope = "leads" | "contacts" | "all";

/**
 * Email uniqueness is per module: leads may reuse a contact email
 * (Create Lead links Contacts), and contacts stay unique among contacts.
 */
export function assertUniqueEmail(
  email: string,
  opts?: { excludeEmail?: string; scope?: UniqueEmailScope },
): RuleResult {
  const normalized = normalizeEmail(email);
  if (!normalized) return fail("EMAIL_REQUIRED", "Email is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return fail("EMAIL_INVALID", "Enter a valid email");
  }
  const exclude = opts?.excludeEmail
    ? normalizeEmail(opts.excludeEmail)
    : null;
  const scope = opts?.scope ?? "all";
  const claimed =
    scope === "leads"
      ? listClaimedLeadEmails()
      : scope === "contacts"
        ? listClaimedContactEmails()
        : listClaimedEmails();
  if (claimed.includes(normalized) && normalized !== exclude) {
    return fail(
      "EMAIL_NOT_UNIQUE",
      scope === "leads"
        ? "A lead with this email already exists"
        : scope === "contacts"
          ? "A contact with this email already exists"
          : "Email must be unique across Leads and Contacts",
    );
  }
  return ok();
}

/** @deprecated Uniqueness is live-store based; kept for call-site compatibility. */
export function claimEmail(_email: string) {
  // no-op: createLead/createContact persist the email into the live store
}

export function releaseEmail(_email: string) {
  // no-op: deleteLead/deleteContact remove the live record
}

/** Deal Name + Account must be unique (§28.1). */
export function assertUniqueDealNameAccount(
  name: string,
  account: string,
  opts?: { excludeName?: string; excludeAccount?: string },
): RuleResult {
  if (!name.trim()) return fail("DEAL_NAME_REQUIRED", "Deal name is required");
  if (!account.trim()) return fail("ACCOUNT_REQUIRED", "Account is required");
  const key = dealKey(name, account);
  const exclude =
    opts?.excludeName && opts?.excludeAccount
      ? dealKey(opts.excludeName, opts.excludeAccount)
      : null;
  if (listClaimedDealKeys().includes(key) && key !== exclude) {
    return fail(
      "DEAL_NOT_UNIQUE",
      "Deal Name + Account must be unique",
    );
  }
  return ok();
}

/** @deprecated Uniqueness is live-store based; kept for call-site compatibility. */
export function claimDealNameAccount(_name: string, _account: string) {
  // no-op: createDeal persists into the live pipeline store
}

export function releaseDealNameAccount(_name: string, _account: string) {
  // no-op: deleteDeal removes the live record
}

/** Required fields cannot be left blank on creation (§28.1). */
export function assertRequired(
  fields: Record<string, unknown>,
  requiredKeys: string[],
): RuleResult {
  for (const key of requiredKeys) {
    const v = fields[key];
    if (v === undefined || v === null || String(v).trim() === "") {
      return fail(
        "REQUIRED_FIELD",
        `${humanizeFieldKey(key)} is required`,
      );
    }
  }
  return ok();
}

/** System fields are non-editable (§28.1): strip them from update payloads. */
export function stripSystemFields<T extends Record<string, unknown>>(
  patch: T,
): Omit<T, (typeof SYSTEM_FIELDS)[number]> {
  const next = { ...patch };
  for (const f of SYSTEM_FIELDS) {
    delete (next as Record<string, unknown>)[f];
  }
  return next;
}

export function assertNoSystemFieldEdits(
  patch: Record<string, unknown>,
): RuleResult {
  const touched = Object.keys(patch).filter((k) =>
    (SYSTEM_FIELDS as readonly string[]).includes(k),
  );
  if (touched.length) {
    return fail(
      "SYSTEM_FIELD_READONLY",
      `System fields are non-editable: ${touched.join(", ")}`,
    );
  }
  return ok();
}
