"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  parseTheme,
  THEME_COOKIE_NAME,
  type Theme,
} from "@/components/theme/theme-cookie";

const STORAGE_KEY = "theme";

type ThemeContextValue = {
  theme?: string;
  resolvedTheme?: string;
  setTheme: (theme: string | ((prev: string) => string)) => void;
  themes: string[];
};

const ThemeContext = createContext<ThemeContextValue>({
  setTheme: () => {},
  themes: ["light", "dark"],
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

function readStoredTheme(): Theme | null {
  try {
    const cookieMatch = document.cookie.match(
      new RegExp(`(?:^|; )${THEME_COOKIE_NAME}=(dark|light)`),
    );
    if (cookieMatch?.[1] === "dark" || cookieMatch?.[1] === "light") {
      return cookieMatch[1];
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    const next = stored ?? "light";
    setThemeState(next);
    applyTheme(next);
    persistTheme(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyTheme(theme);
    persistTheme(theme);
  }, [theme, ready]);

  const setTheme = useCallback((next: string | ((prev: string) => string)) => {
    setThemeState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      return parseTheme(value);
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme,
      themes: ["light", "dark"],
    }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
