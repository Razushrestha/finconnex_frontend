import type { CSSProperties } from "react";
import {
  isWorkspaceStorageKey,
  type CrmWorkspaceSettings,
} from "@/lib/settings/api";
import { readLogoFrame, type LogoFrame } from "@/lib/settings/logo-frame";

export const DEFAULT_BRAND_PRIMARY = "#6376B5";
export const DEFAULT_BRAND_SECONDARY = "#BF83B8";

function readHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`.toUpperCase();
  }
  return null;
}

function brandHex(value: unknown, fallback: string): string {
  return readHex(value) ?? fallback;
}

function catalogName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
  logoLightFrame: LogoFrame;
  logoDarkFrame: LogoFrame;
};

export function resolveWorkspaceBrand(
  settings: CrmWorkspaceSettings | null | undefined,
): WorkspaceBrand {
  const page = settings?.catalog?.["organization/branding"];
  const profile = settings?.catalog?.["organization/company-profile"];
  const catalogLight =
    typeof page?.logoLight === "string" && page.logoLight.trim()
      ? page.logoLight
      : typeof page?.logo === "string"
        ? page.logo
        : "";
  const catalogDark = typeof page?.logoDark === "string" ? page.logoDark : "";
  const secondary = brandHex(
    page?.secondaryColor ?? profile?.secondaryColor ?? settings?.secondaryColor,
    DEFAULT_BRAND_SECONDARY,
  );
  const secondaryIsLight = hexLuminance(secondary) > 0.55;
  return {
    primary: brandHex(
      page?.primaryColor ?? profile?.primaryColor ?? settings?.primaryColor,
      DEFAULT_BRAND_PRIMARY,
    ),
    secondary,
    secondaryIsLight,
    onSecondary: secondaryIsLight ? "#0F172A" : "#F8FAFC",
    appName: catalogName(profile?.companyName) || "FinConnex",
    logoLightUrl: usableLogoUrl(settings?.logoUrl, catalogLight),
    logoDarkUrl: usableLogoUrl(settings?.logoDarkUrl, catalogDark),
    logoLightFrame: readLogoFrame(page, "logoLight"),
    logoDarkFrame: readLogoFrame(page, "logoDark"),
  };
}

function usableLogoUrl(
  stored: string | null | undefined,
  catalog: string,
): string {
  const value = (stored?.trim() || catalog.trim());
  if (!value) return "";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    value.startsWith("data:")
  ) {
    return value;
  }
  return isWorkspaceStorageKey(value) ? value : "";
}

export function workspaceBrandCssVars(brand: WorkspaceBrand): CSSProperties {
  return {
    "--brand-primary": brand.primary,
    "--brand-secondary": brand.secondary,
    "--brand-on-secondary": brand.onSecondary,
    "--brand-gradient": `linear-gradient(168deg, ${brand.primary} 0%, ${brand.secondary} 100%)`,
  } as CSSProperties;
}
