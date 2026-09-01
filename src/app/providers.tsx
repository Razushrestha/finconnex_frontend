"use client";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { PersistenceBootstrap } from "@/components/persistence/PersistenceBootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PersistenceBootstrap>{children}</PersistenceBootstrap>
    </ThemeProvider>
  );
}
