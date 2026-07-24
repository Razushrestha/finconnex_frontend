"use client";
import { ThemeProvider } from "next-themes";
import { PersistenceBootstrap } from "@/components/persistence/PersistenceBootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <PersistenceBootstrap>{children}</PersistenceBootstrap>
    </ThemeProvider>
  );
}
