"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme/theme-provider";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeModeToggle({
  onChange,
}: {
  onChange?: (mode: "light" | "dark") => void;
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeTheme = mounted ? (resolvedTheme ?? theme ?? "light") : "light";

  function pick(mode: "light" | "dark") {
    setTheme(mode);
    onChange?.(mode);
  }

  return (
    <div
      className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full bg-muted p-1"
      role="group"
      aria-label="Theme"
    >
      <button
        type="button"
        onClick={() => pick("light")}
        aria-label="Light mode"
        aria-pressed={activeTheme === "light"}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
          activeTheme === "light"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => pick("dark")}
        aria-label="Dark mode"
        aria-pressed={activeTheme === "dark"}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
          activeTheme === "dark"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
}
