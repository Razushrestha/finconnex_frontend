/** Build /activities/emails/create query for CRM compose. */

export function composeEmailsHref(opts: {
  to?: string | string[];
  cc?: string | string[];
  relatedKind?: string;
  relatedName?: string;
  relatedId?: string;
  subject?: string;
} = {}): string {
  const params = new URLSearchParams();
  const toList = Array.isArray(opts.to) ? opts.to : opts.to ? [opts.to] : [];
  const ccList = Array.isArray(opts.cc) ? opts.cc : opts.cc ? [opts.cc] : [];
  const [first, ...rest] = toList.map((item) => item.trim()).filter(Boolean);
  if (first) params.set("to", first);
  const cc = [...ccList, ...rest].map((item) => item.trim()).filter(Boolean);
  if (cc.length) params.set("cc", cc.join(","));
  if (opts.relatedKind) params.set("relatedKind", opts.relatedKind);
  if (opts.relatedName) params.set("relatedName", opts.relatedName);
  if (opts.relatedId) params.set("relatedId", opts.relatedId);
  if (opts.subject) params.set("subject", opts.subject);
  const q = params.toString();
  return q ? `/activities/emails/create?${q}` : "/activities/emails/create";
}
