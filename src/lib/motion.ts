/** Shared motion classes: Tailwind + tw-animate-css (no Framer).
 * Keep: drag ghost, focus feedback, subtle page fade.
 * Cut: decorative entrance cascades / bounce / violet hover lift.
 */

const reduce = "motion-reduce:animate-none motion-reduce:transition-none";

/** Kanban / draggable record cards — quiet hover, no lift cascade */
export const cardMotion = [
  "transition-[opacity,box-shadow,border-color] duration-150 ease-out",
  "hover:border-slate-300 hover:shadow-sm",
  reduce,
].join(" ");

/** Drag ghost — keep */
export const cardDragging =
  "scale-[0.98] opacity-50 shadow-none ring-2 ring-slate-300/60 motion-reduce:scale-100";

/** Dropdown menus (profile, notifications) */
export const menuEnter = [
  "animate-in fade-in-0 duration-100",
  reduce,
].join(" ");

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
  "border-slate-400 bg-slate-100 ring-1 ring-slate-300/80";
