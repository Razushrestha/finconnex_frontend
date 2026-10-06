function validationText(errorText: string): string {
  try {
    const parsed = JSON.parse(errorText) as { message?: unknown };
    if (Array.isArray(parsed.message)) return parsed.message.join("\n");
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    /* plain text */
  }
  return errorText;
}

function forbiddenPaths(message: string): string[] {
  const paths = new Set<string>();
  for (const match of message.matchAll(
    /property\s+([A-Za-z_][\w.]*)\s+should not exist/gi,
  )) {
    paths.add(match[1]);
  }
  for (const match of message.matchAll(
    /([A-Za-z_][\w.]*)\.property\s+([A-Za-z_][\w]*)\s+should not exist/gi,
  )) {
    paths.add(`${match[1]}.${match[2]}`);
  }
  return [...paths];
}

function removePath(root: Record<string, unknown>, path: string): boolean {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return false;
  let cursor: unknown = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (cursor == null || typeof cursor !== "object") return false;
    const key = parts[i];
    cursor = Array.isArray(cursor)
      ? cursor[Number(key)]
      : (cursor as Record<string, unknown>)[key];
  }
  const last = parts[parts.length - 1];
  if (Array.isArray(cursor)) {
    const index = Number(last);
    if (!Number.isInteger(index) || !(index in cursor)) return false;
    cursor.splice(index, 1);
    return true;
  }
  if (cursor && typeof cursor === "object" && last in cursor) {
    delete (cursor as Record<string, unknown>)[last];
    return true;
  }
  return false;
}

/**
 * One correction pass for a signature-request 400.
 * Returns the next JSON body, or null when the error is not a field we can drop or rename.
 */
export function adaptSignatureRequestPayload(
  rawBody: string,
  errorText: string,
): string | null {
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    body = { ...(parsed as Record<string, unknown>) };
  } catch {
    return null;
  }

  const message = validationText(errorText);
  let changed = false;

  if (
    /property\s+title\s+should not exist/i.test(message) &&
    typeof body.title === "string" &&
    body.name == null
  ) {
    body.name = body.title;
    changed = true;
  }
  if (
    /property\s+name\s+should not exist/i.test(message) &&
    typeof body.name === "string" &&
    body.title == null
  ) {
    body.title = body.name;
    changed = true;
  }
  if (
    /property\s+recipients\s+should not exist/i.test(message) &&
    body.recipients != null &&
    body.signers == null
  ) {
    body.signers = body.recipients;
    changed = true;
  }
  if (
    /property\s+documentId\s+should not exist/i.test(message) &&
    typeof body.documentId === "string" &&
    body.documentIds == null
  ) {
    body.documentIds = [body.documentId];
    changed = true;
  }

  for (const path of forbiddenPaths(message)) {
    if (removePath(body, path)) changed = true;
  }

  if (
    typeof body.expiresAt === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.expiresAt) &&
    /expiresAt\b/i.test(message) &&
    /iso|date string/i.test(message)
  ) {
    body.expiresAt = `${body.expiresAt}T23:59:59.000Z`;
    changed = true;
  }

  return changed ? JSON.stringify(body) : null;
}

export function isSignatureRequestUpsert(path: string[], method: string): boolean {
  if (method !== "POST" && method !== "PATCH") return false;
  const index = path.indexOf("signature-requests");
  if (index < 0) return false;
  const rest = path.slice(index + 1);
  return (method === "POST" && rest.length === 0) || (method === "PATCH" && rest.length === 1);
}
