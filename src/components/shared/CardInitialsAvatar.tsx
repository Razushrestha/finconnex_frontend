"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/activities/shared";

/** Canonical size/placement for card initials (matches All Calls). */
export const CARD_AVATAR_CLASS =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold";

type CardInitialsAvatarProps = {
  /** Display initials, e.g. "AR". If omitted, derived from `name`. */
  initials?: string;
  name?: string;
  /** Tailwind bg/text pair. Defaults from `name` via avatarColor. */
  colorClass?: string;
  className?: string;
  title?: string;
};

/**
 * Short-form initials circle used on board cards.
 * Always h-6 w-6 — place on the right of the owner/assignee meta row.
 */
export function CardInitialsAvatar({
  initials: initialsProp,
  name,
  colorClass,
  className,
  title,
}: CardInitialsAvatarProps) {
  const label = name?.trim() || title || "";
  const letters =
    initialsProp?.trim() || (label ? initials(label) : "?");
  const colors =
    colorClass ??
    (label
      ? avatarColor(label)
      : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100");

  return (
    <span
      title={title ?? (label || undefined)}
      aria-label={label ? `Avatar for ${label}` : undefined}
      className={cn(CARD_AVATAR_CLASS, colors, className)}
    >
      {letters}
    </span>
  );
}

type CardOwnerRowProps = {
  name: string;
  initials?: string;
  colorClass?: string;
  className?: string;
  /** Hide the User icon (rare). */
  hideIcon?: boolean;
};

/**
 * Standard owner/assignee row: icon + name on the left, initials avatar on the right.
 * Same placement on Calls, Deals, Contacts, Companies, Tasks, etc.
 */
export function CardOwnerRow({
  name,
  initials: initialsProp,
  colorClass,
  className,
  hideIcon,
}: CardOwnerRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 text-[11px] text-slate-500",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {!hideIcon && <User className="h-3 w-3 shrink-0 text-slate-400" />}
        <span className="truncate">{name}</span>
      </div>
      <CardInitialsAvatar
        name={name}
        initials={initialsProp}
        colorClass={colorClass}
      />
    </div>
  );
}
