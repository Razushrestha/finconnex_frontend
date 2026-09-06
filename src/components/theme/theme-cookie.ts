export const THEME_COOKIE_NAME = "finconnex-theme";

export type Theme = "light" | "dark";

export function parseTheme(value: string | undefined | null): Theme {
  return value === "dark" ? "dark" : "light";
}
