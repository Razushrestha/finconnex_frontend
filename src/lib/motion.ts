/** Shared motion classes: Tailwind + tw-animate-css (no Framer). */

const reduce = "motion-reduce:animate-none motion-reduce:transition-none";

/** Kanban / draggable record cards */
export const cardMotion = [
  "transition-all duration-200 ease-out will-change-transform",
  "hover:-translate-y-0.5 hover:shadow-md hover:border-violet-200/80",
  reduce,
].join(" ");

export const cardDragging =
  "scale-[0.98] opacity-50 shadow-none ring-2 ring-violet-300/50 motion-reduce:scale-100";

/** Dropdown menus (profile, notifications) */
export const menuEnter = [
  "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150 origin-top-right",
  reduce,
].join(" ");

/** Board / list content when view switches */
export const viewEnter = [
  "animate-in fade-in-0 slide-in-from-bottom-1 duration-200 fill-mode-both",
  reduce,
].join(" ");

/** Search result rows */
export const listItemEnter = [
  "animate-in fade-in-0 slide-in-from-left-1 duration-150 fill-mode-both",
  reduce,
].join(" ");

/** Unread / count badge pop */
export const badgePop = [
  "animate-in zoom-in-50 fade-in-0 duration-200",
  reduce,
].join(" ");

/** Filter sidebar open */
export const filterEnter = [
  "animate-in fade-in-0 slide-in-from-left-2 duration-200 fill-mode-both",
  reduce,
].join(" ");

/** Create form field grid */
export const formEnter = [
  "animate-in fade-in-0 slide-in-from-bottom-1 duration-250 fill-mode-both",
  reduce,
].join(" ");

/** Kanban column idle vs drag-over */
export const dropTargetIdle =
  "transition-all duration-200 ease-out motion-reduce:transition-none";

export const dropTargetActive =
  "border-violet-300 bg-violet-50 ring-2 ring-violet-200/80 scale-[1.01] shadow-sm shadow-violet-100 motion-reduce:scale-100";
