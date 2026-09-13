import type { CSSProperties } from "react";
import type { CrmWorkspaceSettings } from "@/lib/settings/api";

export const DEFAULT_BRAND_PRIMARY = "#5A32A3";
export const DEFAULT_BRAND_SECONDARY = "#0F172A";

function asHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`.toUpperCase();
  }
  return fallback;
}

function hexLuminance(hex: string): number {
  const n = hex.replace("#", "");
  const r = Number.parseInt(n.slice(0, 2), 16) / 255;
  const g = Number.parseInt(n.slice(2, 4), 16) / 255;
  const b = Number.parseInt(n.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export type WorkspaceBrand = {
  primary: string;
  secondary: string;
  secondaryIsLight: boolean;
  onSecondary: string;
  appName: string;
  logoLightUrl: string;
  logoDarkUrl: string;
};

export function resolveWorkspaceBrand(
  settings: CrmWorkspaceSettings | null | undefined,
): WorkspaceBrand {
  const page = settings?.catalog?.["organization/branding"];
  const catalogLight =
    typeof page?.logoLight === "string" ? page.logoLight : "";
  const catalogDark = typeof page?.logoDark === "string" ? page.logoDark : "";
  const secondary = asHex(
    settings?.secondaryColor ?? page?.secondaryColor,
    DEFAULT_BRAND_SECONDARY,
  );
  const secondaryIsLight = hexLuminance(secondary) > 0.55;
  return {
    primary: asHex(
      settings?.primaryColor ?? page?.primaryColor,
      DEFAULT_BRAND_PRIMARY,
    ),
    secondary,
    secondaryIsLight,
    onSecondary: secondaryIsLight ? "#0F172A" : "#F8FAFC",
    appName:
      (typeof page?.appName === "string" && page.appName.trim()
        ? page.appName.trim()
        : "") || "FinConnex",
    logoLightUrl:
      settings?.logoUrl ||
      (catalogLight.startsWith("http") || catalogLight.startsWith("/")
        ? catalogLight
        : ""),
    logoDarkUrl:
      settings?.logoDarkUrl ||
      (catalogDark.startsWith("http") || catalogDark.startsWith("/")
        ? catalogDark
        : ""),
  };
}

export function workspaceBrandCssVars(brand: WorkspaceBrand): CSSProperties {
  return {
    "--brand-primary": brand.primary,
    "--brand-secondary": brand.secondary,
    "--brand-on-secondary": brand.onSecondary,
  } as CSSProperties;
}
