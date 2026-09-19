/**
 * The app's toast. Use this instead of importing `sonner` directly: it is the
 * same API, and it lets the automatic request toasts (fetch-notifier.ts) step
 * aside when a screen shows its own message for the same save.
 */

import { toast as sonnerToast } from "sonner";

let lastExplicitToastAt = 0;

/** When a screen last showed a toast of its own, in ms since the epoch. */
export function explicitToastShownAt(): number {
  return lastExplicitToastAt;
}

function marked<F extends (...args: never[]) => unknown>(fn: F): F {
  return ((...args: Parameters<F>) => {
    lastExplicitToastAt = Date.now();
    return fn(...args);
  }) as F;
}

export const toast = Object.assign(marked(sonnerToast), {
  ...sonnerToast,
  success: marked(sonnerToast.success),
  error: marked(sonnerToast.error),
  info: marked(sonnerToast.info),
  warning: marked(sonnerToast.warning),
  message: marked(sonnerToast.message),
  loading: marked(sonnerToast.loading),
  promise: marked(sonnerToast.promise),
}) as typeof sonnerToast;

/** Shown by the request notifier; doesn't count as a screen's own toast. */
export const automaticToast = sonnerToast;

const FAILURE_WORDS =
  /\b(fail(ed|s)?|error|couldn['’]?t|could not|cannot|can['’]t|unable|reject(ed)?|forbidden|denied|invalid|not allowed|required|missing|conflict|expired|permission|not found)\b/i;

/**
 * A one-line status message as a toast: an error toast when it reads as a
 * failure ("Could not save…"), otherwise a success toast.
 */
export function notify(message: string | null | undefined): void {
  const text = message?.trim();
  if (!text) return;
  if (FAILURE_WORDS.test(text)) toast.error(text);
  else toast.success(text);
}
