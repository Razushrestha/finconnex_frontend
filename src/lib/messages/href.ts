/** Build /activities/messages/create query for a CRM parent. */

export function composeMessagesHref(opts: {
  to?: string;
  relatedKind?: string;
  relatedName?: string;
  relatedId?: string;
} = {}): string {
  const params = new URLSearchParams();
  if (opts.to?.trim()) params.set("to", opts.to.trim());
  if (opts.relatedKind) params.set("relatedKind", opts.relatedKind);
  if (opts.relatedName) params.set("relatedName", opts.relatedName);
  if (opts.relatedId) params.set("relatedId", opts.relatedId);
  const q = params.toString();
  return q ? `/activities/messages/create?${q}` : "/activities/messages/create";
}
