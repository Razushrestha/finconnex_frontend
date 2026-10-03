/** How many extra people a booker can invite on the public form. */
export const MAX_INVITE_GUEST_EMAILS = 10;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteGuestsField = {
  id: string;
  label: string;
  required: boolean;
};

function normalizeInviteEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isInviteGuestsQuestion(question: {
  id?: string;
  label?: string;
}) {
  const id = question.id?.trim().toLowerCase() ?? "";
  const label = question.label?.trim().toLowerCase() ?? "";
  return id === "guests" || label.startsWith("invite guest");
}

/** Visible Invite Guest(s) field, or the default when the page never hid it. */
export function inviteGuestsField(
  questions?: {
    id: string;
    label: string;
    required?: boolean;
    hidden?: boolean;
  }[],
): InviteGuestsField | null {
  const found = (questions ?? []).find(isInviteGuestsQuestion);
  if (found?.hidden) return null;
  if (found) {
    return {
      id: found.id,
      label: found.label.trim() || "Invite Guest(s)",
      required: Boolean(found.required),
    };
  }
  return { id: "guests", label: "Invite Guest(s)", required: false };
}

export function parseInviteGuestEmails(raw: string): string[] {
  const emails: string[] = [];
  for (const part of raw.split(/[,;\s]+/)) {
    const email = normalizeInviteEmail(part);
    if (!email || !EMAIL.test(email) || emails.includes(email)) continue;
    emails.push(email);
    if (emails.length >= MAX_INVITE_GUEST_EMAILS) break;
  }
  return emails;
}

export function addInviteGuestEmails(
  current: string[],
  raw: string,
): { emails: string[]; error?: string } {
  const emails = [...current];
  const tokens = raw
    .split(/[,;]+/)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((part) => part.trim())
    .filter(Boolean);
  if (!tokens.length) return { emails };

  for (const token of tokens) {
    const email = normalizeInviteEmail(token);
    if (!EMAIL.test(email)) {
      return { emails, error: "Enter a valid email" };
    }
    if (emails.includes(email)) continue;
    if (emails.length >= MAX_INVITE_GUEST_EMAILS) {
      return { emails, error: "You can invite up to 10 guests" };
    }
    emails.push(email);
  }
  return { emails };
}

export function inviteGuestEmailsLabel(emails: string[]) {
  return emails.join(", ");
}

/** Extra addresses the booker typed into Invite Guest(s). */
export function inviteGuestEmailsFromAnswers(
  answers: Record<string, string> | undefined,
  questions?: { id: string; label: string }[],
  exclude: Array<string | undefined | null> = [],
): string[] {
  const blocked = new Set(
    exclude.map((email) => (email ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const chunks: string[] = [];
  for (const [id, value] of Object.entries(answers ?? {})) {
    const label = questions?.find((row) => row.id === id)?.label;
    if (id === "guests" || isInviteGuestsQuestion({ id, label })) {
      chunks.push(value);
    }
  }
  return parseInviteGuestEmails(chunks.join(", ")).filter(
    (email) => !blocked.has(email),
  );
}
