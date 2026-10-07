const TOKEN_KEYS = [
  "cancelToken",
  "rescheduleToken",
  "guestToken",
  "manageToken",
  "mailToken",
  "cancellationToken",
  "publicToken",
] as const;

const TOKEN = /^[A-Za-z0-9._~-]{8,200}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recordsFrom(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (!isRecord(data)) return [];
  for (const key of ["data", "items", "bookings", "results", "records"]) {
    const value = data[key];
    if (Array.isArray(value)) return value.filter(isRecord);
    if (isRecord(value)) {
      const nested = recordsFrom(value);
      if (nested.length) return nested;
    }
  }
  return [data];
}

function mentionsEmail(row: Record<string, unknown>, email: string): boolean {
  const stack: unknown[] = [row];
  while (stack.length) {
    const current = stack.pop();
    if (typeof current === "string") {
      if (current.trim().toLowerCase() === email) return true;
      continue;
    }
    if (!current || typeof current !== "object") continue;
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }
    stack.push(...Object.values(current as Record<string, unknown>));
  }
  return false;
}

function tokenInString(value: string): string | null {
  const fromUrl = value
    .trim()
    .match(/\/(?:manage|cancel|reschedule)\/([A-Za-z0-9._~-]{8,200})(?:[/?#]|$)/);
  if (fromUrl?.[1] && TOKEN.test(fromUrl[1])) return fromUrl[1];
  return null;
}

function tokenOn(row: Record<string, unknown>): string | null {
  const stack: unknown[] = [row];
  while (stack.length) {
    const current = stack.pop();
    if (typeof current === "string") {
      const fromUrl = tokenInString(current);
      if (fromUrl) return fromUrl;
      continue;
    }
    if (!isRecord(current)) {
      if (Array.isArray(current)) stack.push(...current);
      continue;
    }
    for (const key of TOKEN_KEYS) {
      const value = current[key];
      if (typeof value === "string" && TOKEN.test(value.trim())) return value.trim();
    }
    stack.push(...Object.values(current));
  }
  return null;
}

/** Token on a booking this app just created. The create reply often omits the guest email. */
export function mailTokenFromCreated(data: unknown): string | null {
  for (const row of recordsFrom(data)) {
    const token = tokenOn(row);
    if (token) return token;
  }
  return null;
}

/** A guest mail token from a booking whose invitee is this address. */
export function guestMailTokenFromBookings(data: unknown, email: string): string | null {
  const want = email.trim().toLowerCase();
  if (!want.includes("@")) return null;
  for (const row of recordsFrom(data)) {
    if (!mentionsEmail(row, want)) continue;
    const token = tokenOn(row);
    if (token) return token;
  }
  return null;
}

export function bookingIdsForGuest(data: unknown, email: string): string[] {
  const want = email.trim().toLowerCase();
  const ids: string[] = [];
  for (const row of recordsFrom(data)) {
    if (!mentionsEmail(row, want)) continue;
    const id = row.id ?? row.bookingId;
    if (typeof id === "string" && id.trim()) ids.push(id.trim());
  }
  return ids;
}
