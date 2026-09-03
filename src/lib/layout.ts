/**
 * Shared layout tokens so CRM pages fill large monitors without
 * stretching form fields or leaving a 1400px island on a 32" display.
 */

/** List / hub pages: use the full main pane, cap only on ultra-wide. */
export const PAGE_FRAME =
  "relative mx-auto flex w-full max-w-[1920px] flex-col p-3 sm:p-4 lg:px-6 lg:py-4 2xl:px-8 2xl:py-5";

/** Drop-in width cap when a page already has its own padding. */
export const PAGE_MAX = "mx-auto w-full max-w-[1920px]";

export const SETTINGS_FRAME =
  "mx-auto w-full max-w-[1920px] px-4 sm:px-6 2xl:px-8";

/** Create-entity field canvas: 2–4 columns, never 5+ ultra-wide inputs. */
export const FORM_CANVAS =
  "mx-auto grid w-full max-w-[90rem] grid-cols-1 content-start gap-x-5 gap-y-4 px-3 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 lg:px-6 xl:grid-cols-4 2xl:max-w-[100rem] 2xl:gap-x-6 2xl:px-8";

/** Activity create pages: growing main column + fixed-width aside. */
export const FORM_SPLIT =
  "mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-4 px-4 py-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:gap-6 2xl:px-8";

export const DETAIL_SPLIT =
  "mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_minmax(260px,360px)] 2xl:gap-6";

export const FIELD_ROW =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

export const BOARD_PAGE =
  "flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 p-3 pr-4 lg:p-4 lg:pr-5 2xl:p-5 2xl:pr-6";

/** Record / content cards — always white so boards match Contacts. */
export const CARD_SURFACE = "bg-white dark:bg-zinc-900";

/** Horizontal strip that holds every kanban stage (Tasks reference). */
export const KANBAN_BOARD_ROW =
  "flex h-full w-full min-w-0 items-stretch gap-3 overflow-x-auto overflow-y-hidden bg-slate-50 p-1 pr-3";

/**
 * Full-height stage scrollbar in the gutter to the right of the well —
 * not inset inside the cards. Only appears when the column overflows.
 */
export const KANBAN_STAGE_SCROLL =
  "kanban-stage-scroll flex h-full min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden -mr-2.5 [&>*]:min-h-full";

/** Kanban column well behind cards. */
export const KANBAN_WELL = "border-slate-200/60 bg-slate-100/60";

/** Kanban column header — brand light purple. */
export const KANBAN_HEADER =
  "flex h-14 w-full shrink-0 flex-col justify-center overflow-hidden rounded-xs border border-[#5A32A3]/12 bg-[#F3ECFB] p-1.5";

/** Collapsed kanban rail tint (no fixed height). */
export const KANBAN_HEADER_RAIL =
  "rounded-xs border border-[#5A32A3]/12 bg-[#F3ECFB]";

/** Count pill on kanban headers. */
export const KANBAN_HEADER_COUNT =
  "inline-flex shrink-0 items-center rounded-full bg-[#5A32A3]/15 px-2.5 py-0.5 text-xs font-medium text-[#5A32A3]";

/**
 * Expanded kanban column. Stays at least 272px; grows equally to fill
 * leftover page width when there are few stages. Extra stages keep the
 * minimum width and the row scrolls.
 */
export const KANBAN_COL =
  "flex h-full min-h-0 min-w-[272px] flex-1 flex-col overflow-visible";

/** Collapsed kanban rail. */
export const KANBAN_COL_COLLAPSED =
  "w-10 min-w-[2.5rem] max-w-[2.5rem] flex-shrink-0";

/** Title row inside a kanban header. */
export const KANBAN_HEADER_TITLE =
  "min-w-0 flex-1 truncate text-xs font-semibold leading-5 text-foreground xl:text-sm";

/** Record card on every kanban board — same size as Leads. */
export const KANBAN_CARD =
  "flex h-[252px] w-full min-w-0 max-w-full flex-col overflow-hidden";

/** Drop ghost matching kanban card height. */
export const KANBAN_CARD_SLOT = "h-[252px]";

/** Card-move placeholder — same on every board (Tasks reference). */
export const KANBAN_DROP_GHOST =
  "h-20 w-full shrink-0 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/50 transition-all animate-pulse";

/** Page canvas behind cards. */
export const PAGE_CANVAS = "bg-slate-50";

/** Persistent Zoho-style utility bar at the bottom of the dashboard. */
export const BOTTOM_BAR_H = "h-10";
export const BOTTOM_BAR_OFFSET = "pb-10";
