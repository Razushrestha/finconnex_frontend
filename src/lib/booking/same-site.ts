/**
 * Public booking endpoints have no dashboard session, so they only answer the
 * app's own pages. Browsers label such calls `Sec-Fetch-Site`; older clients
 * fall back to matching `Origin` / `Referer` against the request URL.
 */
export function sameSiteRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "same-site") return true;
  if (site === "cross-site") return false;
  try {
    const origin = request.headers.get("origin");
    if (origin) {
      return new URL(origin).origin === new URL(request.url).origin;
    }
    const referer = request.headers.get("referer");
    if (referer) {
      return new URL(referer).origin === new URL(request.url).origin;
    }
  } catch {
    return false;
  }
  return false;
}
