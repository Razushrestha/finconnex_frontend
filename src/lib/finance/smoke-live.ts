/**
 * Shared live-CRM probe helpers for finance smokes.
 * Authenticated GETs should return 200; unauthenticated probes may return 401.
 */

export function isFinanceLiveOk(
  status: number,
  message: string,
  method = "GET",
): boolean {
  if (status === 200 || status === 201) return true;
  // Soft-delete / missing resource still proves the route exists.
  if (status === 204) return true;
  if (status === 404) {
    const msg = message.toLowerCase();
    // Nest "Cannot GET /v1/..." means the route is missing — not OK.
    if (msg.includes("cannot ") && msg.includes("/v1/")) return false;
    return true;
  }

  const msg = message.toLowerCase();
  return (
    (status === 401 || status === 403) &&
    (msg.includes("token") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden") ||
      msg.includes("jwt") ||
      msg.includes("sign in") ||
      msg.includes("session"))
  );
}

export function financeLiveNote(
  status: number,
  message: string,
  method = "GET",
): string {
  if (status === 200 || status === 201) {
    return `ok 200: ${message || "success"}`;
  }
  if (status === 204) return `ok 204: ${message || "no content"}`;
  if (status === 404) {
    const msg = message.toLowerCase();
    if (msg.includes("cannot ") && msg.includes("/v1/")) {
      return `unexpected ${status}: ${message}`;
    }
    return `routed (not found): ${message}`;
  }
  if (isFinanceLiveOk(status, message, method)) {
    return `routed + auth required: ${message}`;
  }
  return `unexpected ${status}: ${message}`;
}
