/** Shared motion classes: Tailwind + tw-animate-css (no Framer).
 * Keep: drag ghost, focus feedback, subtle page fade.
 * Cut: decorative entrance cascades / bounce / violet hover lift.
 */

import { KANBAN_CARD } from "@/lib/layout";

const reduce = "motion-reduce:animate-none motion-reduce:transition-none";

/**
 * Canonical record-card box — same as All Calls `CallCard`.
 * Use on every kanban / board record card for a consistent shell.
 */
export const entityCardShell =
  "rounded-md border border-slate-100 !bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:!bg-zinc-900";

/** Drag affordance for board cards */
export const entityCardInteractive =
  "cursor-pointer select-none";

/** Full CallCard-equivalent shell (shell + interactive). Pair with cardMotion. */
export const entityCardBox = `${entityCardShell} ${entityCardInteractive} ${KANBAN_CARD}`;

/** Subject / title on board and list rows — underline on hover, click, or card hover */
export const cardSubject =
  "cursor-pointer underline-offset-[3px] decoration-current hover:underline active:underline group-hover/card:underline";

/** Kanban / draggable record cards — quiet hover, no lift cascade */
export const cardMotion = [
  "transition-[opacity,box-shadow,border-color,background-color] duration-150 ease-out",
  "hover:border-slate-300 hover:shadow-sm hover:bg-violet-50/40",
  reduce,
].join(" ");

/** Drag ghost — keep */
export const cardDragging =
  "scale-[0.98] opacity-50 shadow-none ring-2 ring-slate-300/60 motion-reduce:scale-100";

/** Dropdown menus (profile, notifications) */
export const menuEnter = ["animate-in fade-in-0 duration-100", reduce].join(
  " ",
);

/** Board / list content when view switches — subtle page fade only */
export const viewEnter = [
  "animate-in fade-in-0 duration-150 fill-mode-both",
  reduce,
].join(" ");

/** Search / list rows — no staggered slide-in cascade */
export const listItemEnter = "";

/** Unread / count badge — instant, no pop */
export const badgePop = "";

/** Filter sidebar open — fade only */
export const filterEnter = [
  "animate-in fade-in-0 duration-150 fill-mode-both",
  reduce,
].join(" ");

/** Create form field grid — fade only, no slide cascade */
export const formEnter = [
  "animate-in fade-in-0 duration-150 fill-mode-both",
  reduce,
].join(" ");

/** Kanban column idle vs drag-over — no scale bounce */
export const dropTargetIdle =
  "transition-colors duration-150 ease-out motion-reduce:transition-none";

export const dropTargetActive =
  "border-slate-400 bg-foreground/10 ring-1 ring-slate-300/80";
