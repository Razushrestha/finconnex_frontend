"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";

import { useTheme } from "@/components/theme/theme-provider";
import { installFetchNotifier } from "@/lib/notify/fetch-notifier";

/**
 * The app's one toaster, in the app's theme, plus the automatic toasts for
 * saves (fetch-notifier.ts).
 */
export function AppToaster() {
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    installFetchNotifier();
  }, []);

  return <Toaster theme={(resolvedTheme ?? theme) === "dark" ? "dark" : "light"} position="bottom-right" richColors closeButton visibleToasts={4} />;
}
