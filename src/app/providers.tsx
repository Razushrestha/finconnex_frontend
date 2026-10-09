"use client";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { PersistenceBootstrap } from "@/components/persistence/PersistenceBootstrap";
import { AppToaster } from "@/components/notify/AppToaster";
import { AppDialogHost } from "@/components/notify/AppDialogHost";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppToaster />
      <AppDialogHost />
      <PersistenceBootstrap>{children}</PersistenceBootstrap>
    </ThemeProvider>
  );
}
