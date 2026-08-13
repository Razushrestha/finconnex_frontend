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

/** Kanban column well behind cards — same as Leads. */
export const KANBAN_WELL = "border-slate-200/60 bg-slate-100/60";

/** Kanban column header — same as Leads / Contacts. */
export const KANBAN_HEADER =
  "rounded-xs border border-slate-200/60 bg-primary/10 p-1";

/** Page canvas behind cards. */
export const PAGE_CANVAS = "bg-slate-50";
