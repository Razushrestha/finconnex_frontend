"use client";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { PersistenceBootstrap } from "@/components/persistence/PersistenceBootstrap";
import { AppToaster } from "@/components/notify/AppToaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppToaster />
      <PersistenceBootstrap>{children}</PersistenceBootstrap>
    </ThemeProvider>
  );
}
