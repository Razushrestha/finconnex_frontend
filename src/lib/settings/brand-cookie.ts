/**
 * The workspace's last-known brand colours, kept in a cookie so the server can
 * render the dashboard in them. Without it the first paint used the default
 * palette and switched once the settings arrived, a visible colour flash.
 *
 * Value: `<workspaceId>|<primary>|<secondary>|<style>`, colours as #RRGGBB,
 * style `gradient` or `solid`.
 */
export const BRAND_COOKIE = "fx_brand";

export type BrandColors = {
  primary: string;
  secondary: string;
  style: "gradient" | "solid";
};

const HEX = /^#[0-9A-F]{6}$/;

export function parseBrandCookie(
  raw: string | undefined,
  workspaceId: string | undefined,
): BrandColors | null {
  if (!raw || !workspaceId) return null;
  const [ws, primary, secondary, style] = decodeURIComponent(raw).split("|");
  if (ws !== workspaceId) return null;
  if (!primary || !secondary || !HEX.test(primary) || !HEX.test(secondary)) {
    return null;
  }
  return { primary, secondary, style: style === "solid" ? "solid" : "gradient" };
}

/** Saves the colours for the next page load (a year; refreshed as they change). */
export function writeBrandCookie(workspaceId: string, colors: BrandColors) {
  if (typeof document === "undefined" || !workspaceId) return;
  const value = encodeURIComponent(
    `${workspaceId}|${colors.primary}|${colors.secondary}|${colors.style}`,
  );
  if (document.cookie.split("; ").includes(`${BRAND_COOKIE}=${value}`)) return;
  document.cookie = `${BRAND_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}
