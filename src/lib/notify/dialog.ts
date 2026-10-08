/**
 * The app's own confirm / alert / prompt dialogs, in place of the browser's
 * `window.confirm`, `window.alert` and `window.prompt` boxes.
 *
 * Each call returns a promise and opens one branded dialog in the working
 * area (rendered by `AppDialogHost`, mounted once in the app providers).
 * Calls made while a dialog is open wait their turn.
 *
 *   if (!(await confirmDialog({ title: "Delete note?", message, tone: "danger" }))) return;
 *   const name = await promptDialog({ title: "Rename file", defaultValue: doc.fileName });
 */

import type { ReactNode } from "react";

export type DialogTone = "default" | "danger";

export type ConfirmDialogOptions = {
  title?: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** "danger" for destructive actions: red button and icon. */
  tone?: DialogTone;
};

export type AlertDialogOptions = {
  title?: string;
  message?: ReactNode;
  okText?: string;
  tone?: DialogTone;
};

export type PromptDialogOptions = {
  title?: string;
  message?: ReactNode;
  /** The text box's label. */
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  inputType?: "text" | "url" | "number" | "email";
  /** Empty input cannot be submitted unless this is true. */
  allowEmpty?: boolean;
};

export type DialogRequest =
  | {
      id: number;
      kind: "confirm";
      options: ConfirmDialogOptions;
      resolve: (ok: boolean) => void;
    }
  | {
      id: number;
      kind: "alert";
      options: AlertDialogOptions;
      resolve: () => void;
    }
  | {
      id: number;
      kind: "prompt";
      options: PromptDialogOptions;
      resolve: (value: string | null) => void;
    };

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

let nextId = 1;
let queue: DialogRequest[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function enqueue(request: DistributiveOmit<DialogRequest, "id">) {
  queue = [...queue, { ...request, id: nextId++ } as DialogRequest];
  emit();
}

/** For `AppDialogHost`: the dialog to show now, if any. */
export function currentDialog(): DialogRequest | null {
  return queue[0] ?? null;
}

export function subscribeDialogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** For `AppDialogHost`: close the shown dialog and show the next one. */
export function settleDialog(id: number) {
  queue = queue.filter((item) => item.id !== id);
  emit();
}

function asOptions<T extends { message?: ReactNode }>(input: string | T): T {
  return typeof input === "string" ? ({ message: input } as T) : input;
}

/** Resolves true when the user confirms, false when they cancel. */
export function confirmDialog(
  input: string | ConfirmDialogOptions,
): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) =>
    enqueue({ kind: "confirm", options: asOptions(input), resolve }),
  );
}

/** Resolves once the user dismisses the message. */
export function alertDialog(input: string | AlertDialogOptions): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) =>
    enqueue({ kind: "alert", options: asOptions(input), resolve }),
  );
}

/** Resolves to the entered text, or null when the user cancels. */
export function promptDialog(
  input: string | PromptDialogOptions,
): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const options =
    typeof input === "string" ? { title: input } : input;
  return new Promise((resolve) =>
    enqueue({ kind: "prompt", options, resolve }),
  );
}
