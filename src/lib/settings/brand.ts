import type { CSSProperties } from "react";
import {
  isWorkspaceStorageKey,
  type CrmWorkspaceSettings,
} from "@/lib/settings/api";
import { readLogoFrame, type LogoFrame } from "@/lib/settings/logo-frame";

export const DEFAULT_BRAND_PRIMARY = "#6376B5";
export const DEFAULT_BRAND_SECONDARY = "#BF83B8";
export const BRAND_COOKIE = "fc_brand";

export type RememberedBrand = { p: string; s: string; n: string };

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

/** A failed settings read comes back with no saved colours and no timestamps. */
export function isBareSettingsFallback(
  settings: CrmWorkspaceSettings | null | undefined,
): boolean {
  if (!settings) return true;
  return (
    !settings.id &&
    !settings.updatedAt &&
    !settings.createdAt &&
    !readHex(settings.primaryColor) &&
    !readHex(settings.secondaryColor)
  );
}

export function settingsCarryBrand(
  settings: CrmWorkspaceSettings | null | undefined,
): boolean {
  if (!settings) return false;
  const page = settings.catalog?.["organization/branding"];
  const profile = settings.catalog?.["organization/company-profile"];
  return Boolean(
    readHex(page?.primaryColor) ||
    readHex(page?.secondaryColor) ||
    readHex(profile?.primaryColor) ||
    readHex(profile?.secondaryColor) ||
    readHex(settings.primaryColor) ||
    readHex(settings.secondaryColor) ||
    catalogName(profile?.companyName),
  );
}

export function parseRememberedBrand(
  raw: string | null | undefined,
): RememberedBrand | null {
  if (!raw) return null;
  let text = raw.trim();
  if (!text) return null;
  try {
    if (text.includes("%")) text = decodeURIComponent(text);
  } catch {
    /* already decoded */
  }
  try {
    const parsed = JSON.parse(text) as { p?: unknown; s?: unknown; n?: unknown };
    const p = readHex(parsed.p);
    const s = readHex(parsed.s);
    if (!p || !s) return null;
    const n = catalogName(parsed.n).replace(/[<>]/g, "").slice(0, 80);
    return { p, s, n };
  } catch {
    return null;
  }
}

function brandFromRemembered(
  base: WorkspaceBrand,
  remembered: RememberedBrand,
): WorkspaceBrand {
  const secondaryIsLight = hexLuminance(remembered.s) > 0.55;
  return {
    ...base,
    primary: remembered.p,
    secondary: remembered.s,
    secondaryIsLight,
    onSecondary: secondaryIsLight ? "#0F172A" : "#F8FAFC",
    appName: remembered.n || base.appName,
  };
}

/**
 * Live branding wins. A settings fallback with no saved colours keeps the
 * brand from the last successful load so the shell does not change colour.
 */
export function selectWorkspaceBrand(
  settings: CrmWorkspaceSettings | null | undefined,
  preview: Partial<Pick<CrmWorkspaceSettings, "primaryColor" | "secondaryColor">> | null,
  remembered: RememberedBrand | null,
): WorkspaceBrand {
  const resolved = resolveWorkspaceBrand({
    ...settings,
    primaryColor: preview?.primaryColor ?? settings?.primaryColor,
    secondaryColor: preview?.secondaryColor ?? settings?.secondaryColor,
  });
  if (preview && (readHex(preview.primaryColor) || readHex(preview.secondaryColor))) {
    return resolved;
  }
  if (
    settings &&
    !isBareSettingsFallback(settings) &&
    settingsCarryBrand(settings)
  ) {
    return resolved;
  }
  if (remembered) return brandFromRemembered(resolved, remembered);
  return resolved;
}

export function rememberWorkspaceBrand(brand: WorkspaceBrand) {
  if (typeof document === "undefined") return;
  const payload = encodeURIComponent(
    JSON.stringify({ p: brand.primary, s: brand.secondary, n: brand.appName }),
  );
  document.cookie = `${BRAND_COOKIE}=${payload}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function workspaceBrandCssVars(brand: WorkspaceBrand): CSSProperties {
  return {
    "--brand-primary": brand.primary,
    "--brand-secondary": brand.secondary,
    "--brand-on-secondary": brand.onSecondary,
    "--brand-gradient": `linear-gradient(168deg, ${brand.primary} 0%, ${brand.secondary} 100%)`,
  } as CSSProperties;
}
