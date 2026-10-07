import {
  DEFAULT_BRAND_PRIMARY,
  DEFAULT_BRAND_SECONDARY,
} from "@/lib/settings/brand";
import { loadSettingsValues } from "@/lib/settings/settings-store";

export type EmailBrand = {
  primary: string;
  secondary: string;
  /** Header and button blend primary into secondary. */
  gradient: boolean;
  appName: string;
};

const SETTINGS_CACHE_KEY = "fc.settings.shell.v1";

function asHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`.toUpperCase();
  }
  return fallback;
}

export function emailBrandFromValues(input: {
  primaryColor?: unknown;
  secondaryColor?: unknown;
  emailGradient?: unknown;
  appName?: unknown;
} | null | undefined): EmailBrand {
  const appName =
    typeof input?.appName === "string" && input.appName.trim()
      ? input.appName.trim()
      : "FinConnex";
  return {
    primary: asHex(input?.primaryColor, DEFAULT_BRAND_PRIMARY),
    secondary: asHex(input?.secondaryColor, DEFAULT_BRAND_SECONDARY),
    gradient: true,
    appName,
  };
}

export function emailBrandFromSettings(settings: {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  catalog?: Record<string, Record<string, string | number | boolean> | undefined> | null;
} | null | undefined): EmailBrand {
  const page = settings?.catalog?.["organization/branding"];
  return emailBrandFromValues({
    primaryColor: settings?.primaryColor ?? page?.primaryColor,
    secondaryColor: settings?.secondaryColor ?? page?.secondaryColor,
    emailGradient: page?.emailGradient,
    appName: page?.appName,
  });
}

/** Inline style for the email header and the main button. Always the site gradient. */
export function emailFillStyle(brand: EmailBrand): string {
  const primary = brand.primary;
  const secondary = brand.secondary;
  if (primary.toLowerCase() === secondary.toLowerCase()) {
    return `background-color:${primary};`;
  }
  return `background-color:${primary};background-image:linear-gradient(135deg,${primary} 0%,${secondary} 100%);`;
}

type CachedBrandSettings = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  catalog?: Record<string, Record<string, string | number | boolean>> | null;
};

/** Colours the signed-in browser last saved. */
export function readClientEmailBrand(): EmailBrand {
  const local =
    typeof window === "undefined"
      ? {}
      : loadSettingsValues("organization/branding");
  let cached: CachedBrandSettings | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(SETTINGS_CACHE_KEY);
      const parsed = raw
        ? (JSON.parse(raw) as { settings?: CachedBrandSettings | null })
        : null;
      cached = parsed?.settings ?? null;
    } catch {
      cached = null;
    }
  }
  const page = cached?.catalog?.["organization/branding"];
  return emailBrandFromValues({
    primaryColor: cached?.primaryColor || page?.primaryColor || local.primaryColor,
    secondaryColor:
      cached?.secondaryColor || page?.secondaryColor || local.secondaryColor,
    emailGradient: page?.emailGradient ?? local.emailGradient,
    appName: page?.appName || local.appName,
  });
}
