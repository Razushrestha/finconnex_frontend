/**
 * Email Configurations for booking notifications: who the mail is "from", where
 * replies go, and who is copied.
 *
 * What is saved is a role ("staff"), never an address, so the setting follows
 * whoever is allocated to the booking. Each audience (To Customer / To User)
 * keeps its own set. Reply To and Cc are applied to the outgoing message.
 * "Send from" is saved with the page, but delivery always goes out through the
 * workspace mail sender: mail providers only send from verified addresses, so
 * a staff member's own address cannot be used as the envelope sender.
 */

export type EmailAudience = "customer" | "user";

export type EmailRouting = {
  sendFrom: string;
  replyTo: string;
  cc: string;
};

export type EmailNotifyConfig = EmailRouting & {
  /** The To User tab. The fields above are the To Customer tab. */
  user?: EmailRouting;
  /**
   * The super admin's address when this was last saved. A guest booking from
   * another browser has no signed-in admin, so the address travels with the page.
   */
  superAdminEmail?: string;
};

export type EmailOption = {
  value: string;
  label: string;
  /** The "nothing selected" row. */
  placeholder?: boolean;
};

export const SEND_FROM_DEFAULT = "default";
export const PARTY_SUPER_ADMIN = "super_admin";
export const PARTY_STAFF = "staff";
export const PARTY_CUSTOMER = "customer";

const SEND_FROM_VALUES = [SEND_FROM_DEFAULT, PARTY_SUPER_ADMIN, PARTY_STAFF];
const REPLY_TO_CUSTOMER_TAB = ["", PARTY_SUPER_ADMIN, PARTY_STAFF];
// Replying to the customer only makes sense on emails that go to the team.
const REPLY_TO_USER_TAB = ["", PARTY_SUPER_ADMIN, PARTY_STAFF, PARTY_CUSTOMER];
const CC_VALUES = ["", PARTY_SUPER_ADMIN, PARTY_STAFF];

export function superAdminLabel(email: string) {
  const address = email.trim();
  return address
    ? `Super admin's email address (${address})`
    : "Super admin's email address";
}

const STAFF_LABEL = "Allocated staff member's email address";
const CUSTOMER_LABEL = "Customer's Email address";

export function sendFromOptions(superAdminEmail = ""): EmailOption[] {
  return [
    { value: SEND_FROM_DEFAULT, label: "Default FinConnex email address" },
    { value: PARTY_SUPER_ADMIN, label: superAdminLabel(superAdminEmail) },
    { value: PARTY_STAFF, label: STAFF_LABEL },
  ];
}

export function replyToOptions(
  audience: EmailAudience,
  superAdminEmail = "",
): EmailOption[] {
  return [
    { value: PARTY_SUPER_ADMIN, label: superAdminLabel(superAdminEmail) },
    { value: PARTY_STAFF, label: STAFF_LABEL },
    ...(audience === "user"
      ? [{ value: PARTY_CUSTOMER, label: CUSTOMER_LABEL }]
      : []),
    { value: "", label: "Select Reply To", placeholder: true },
  ];
}

export function ccOptions(superAdminEmail = ""): EmailOption[] {
  return [
    { value: PARTY_SUPER_ADMIN, label: superAdminLabel(superAdminEmail) },
    { value: PARTY_STAFF, label: STAFF_LABEL },
    { value: "", label: "Select Copy (Cc)", placeholder: true },
  ];
}

type PartyContext = { superAdminEmail?: string; staffEmail?: string };

function isEmail(value: string | undefined): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

function sameEmail(a: string | undefined, b: string | undefined) {
  return isEmail(a) && isEmail(b) && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** A saved value as one of `allowed`, or "" when it is not usable. */
function partyFrom(
  value: string | undefined,
  allowed: readonly string[],
  ctx: PartyContext,
): string {
  const text = (value ?? "").trim();
  if (allowed.includes(text)) return text;
  // Older saves stored the address itself.
  if (sameEmail(text, ctx.superAdminEmail) && allowed.includes(PARTY_SUPER_ADMIN)) {
    return PARTY_SUPER_ADMIN;
  }
  if (sameEmail(text, ctx.staffEmail) && allowed.includes(PARTY_STAFF)) {
    return PARTY_STAFF;
  }
  return "";
}

/** Any saved routing as values the dropdowns understand. */
export function normalizeEmailRouting(
  raw: Partial<EmailRouting> | undefined,
  audience: EmailAudience,
  ctx: PartyContext = {},
): EmailRouting {
  return {
    sendFrom: partyFrom(raw?.sendFrom, SEND_FROM_VALUES, ctx) || SEND_FROM_DEFAULT,
    replyTo: partyFrom(
      raw?.replyTo,
      audience === "user" ? REPLY_TO_USER_TAB : REPLY_TO_CUSTOMER_TAB,
      ctx,
    ),
    cc: partyFrom(raw?.cc, CC_VALUES, ctx),
  };
}

/** The routing shown (and used) for one audience. */
export function routingFor(
  config: EmailNotifyConfig | undefined,
  audience: EmailAudience,
  ctx: PartyContext = {},
): EmailRouting {
  return normalizeEmailRouting(
    audience === "user" ? config?.user : config,
    audience,
    {
      superAdminEmail: ctx.superAdminEmail || config?.superAdminEmail,
      staffEmail: ctx.staffEmail,
    },
  );
}

/**
 * The config to save after one dropdown changed. The other audience's choices
 * are kept, and the signed-in admin's address is remembered.
 */
export function updateEmailConfig(
  config: EmailNotifyConfig | undefined,
  audience: EmailAudience,
  partial: Partial<EmailRouting>,
  superAdminEmail = "",
): EmailNotifyConfig {
  const admin = superAdminEmail.trim() || config?.superAdminEmail || "";
  const ctx = { superAdminEmail: admin };
  const customer = routingFor(config, "customer", ctx);
  const user = routingFor(config, "user", ctx);
  const next =
    audience === "user"
      ? { customer, user: normalizeEmailRouting({ ...user, ...partial }, "user", ctx) }
      : {
          customer: normalizeEmailRouting({ ...customer, ...partial }, "customer", ctx),
          user,
        };
  return {
    ...next.customer,
    user: next.user,
    ...(admin ? { superAdminEmail: admin } : {}),
  };
}

export type EmailRouteContext = PartyContext & {
  customerEmail?: string;
  /** The recipient. Never copied or replied to on their own message. */
  to: string;
};

/** What to add to an outgoing message for this audience. */
export function resolveEmailRouting(
  config: EmailNotifyConfig | undefined,
  audience: EmailAudience,
  ctx: EmailRouteContext,
): { replyTo?: string; cc: string[] } {
  const superAdminEmail = ctx.superAdminEmail || config?.superAdminEmail;
  const routing = routingFor(config, audience, {
    superAdminEmail,
    staffEmail: ctx.staffEmail,
  });
  const addressOf = (party: string) => {
    if (party === PARTY_SUPER_ADMIN) return superAdminEmail;
    if (party === PARTY_STAFF) return ctx.staffEmail;
    if (party === PARTY_CUSTOMER) return ctx.customerEmail;
    return undefined;
  };
  const recipient = ctx.to.trim().toLowerCase();
  const usable = (party: string) => {
    const address = addressOf(party);
    return isEmail(address) && address.trim().toLowerCase() !== recipient
      ? address.trim()
      : "";
  };
  const replyTo = usable(routing.replyTo);
  const cc = usable(routing.cc);
  return { ...(replyTo ? { replyTo } : {}), cc: cc ? [cc] : [] };
}
