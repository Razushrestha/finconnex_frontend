/**
 * Locked Lead Card product decisions (spec §13 open questions → closed).
 * Change only via explicit product sign-off — smokes/CI assert these values.
 */

/** Unreplied inbound SMS/email ages past this → broken (red). */
export const UNREPLIED_THRESHOLD_HOURS_DEFAULT = 24;

/** Owner avatar on card face — off unless admin enables it. */
export const OWNER_AVATAR_DEFAULT = false as const;

/**
 * Note + Attachment quick actions never show urgency color or badges.
 * They create completed timeline entries only.
 */
export const FOREVER_NEUTRAL_QUICK_ACTIONS = ["note", "attachment"] as const;

/**
 * v1 Lead Card does not auto-escalate overdue items or send push.
 * Urgency is visual + Activity Summary only; Work Queue remains the ops surface.
 */
export const ESCALATION_ENABLED = false as const;
export const PUSH_NOTIFICATIONS_FOR_CARD = false as const;

/** Call / SMS / Email quick actions never render green (spec §7). */
export const NO_GREEN_QUICK_ACTIONS = ["call", "sms", "email"] as const;

export const LEAD_CARD_PRODUCT_DECISIONS = {
  unrepliedThresholdHoursDefault: UNREPLIED_THRESHOLD_HOURS_DEFAULT,
  ownerAvatarDefault: OWNER_AVATAR_DEFAULT,
  foreverNeutralQuickActions: FOREVER_NEUTRAL_QUICK_ACTIONS,
  escalationEnabled: ESCALATION_ENABLED,
  pushNotificationsForCard: PUSH_NOTIFICATIONS_FOR_CARD,
  noGreenQuickActions: NO_GREEN_QUICK_ACTIONS,
} as const;

export type LeadCardProductDecisions = typeof LEAD_CARD_PRODUCT_DECISIONS;
