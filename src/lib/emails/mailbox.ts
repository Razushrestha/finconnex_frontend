import type { Email } from "@/lib/emails/types";

export type MailFolder =
  | "all"
  | "inbox"
  | "sent"
  | "drafts"
  | "scheduled"
  | "archive"
  | "important"
  | "starred"
  | "spam"
  | "trash";

export type MailLabel = "Mail" | "Home" | "Work" | "Friends";

export interface MailboxFlags {
  starred?: boolean;
  archived?: boolean;
  important?: boolean;
  spam?: boolean;
  trash?: boolean;
  pinned?: boolean;
  folderId?: string;
  focusOverride?: "focused" | "other";
  labels?: MailLabel[];
}

const KEY = "finconnex.emails.mailbox.v1";
const STARRED_KEY = "finconnex.emails.starred";
const EVENT = "finconnex-emails-mailbox";

export const MAIL_LABELS: { id: MailLabel; color: string; dot: string }[] = [
  { id: "Mail", color: "bg-pink-50 text-pink-700", dot: "bg-pink-400" },
  { id: "Home", color: "bg-rose-50 text-rose-600", dot: "bg-rose-400" },
  { id: "Work", color: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  { id: "Friends", color: "bg-orange-50 text-orange-700", dot: "bg-orange-400" },
];

const OUR_MAIL = /@(finconnex\.com|nepatronix\.com)$/i;
const KNOWN_LABELS = new Set<string>(MAIL_LABELS.map((item) => item.id));

export function isOurAddress(value: string) {
  return OUR_MAIL.test(value.trim());
}

export function isOutbound(email: Email) {
  return isOurAddress(email.from);
}

export function labelTone(label: MailLabel) {
  return MAIL_LABELS.find((item) => item.id === label)?.color ?? "bg-slate-100 text-slate-600";
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

function seedFromLegacyStars(map: Record<string, MailboxFlags>) {
  const ids = readJson<string[]>(STARRED_KEY, []);
  if (!Array.isArray(ids)) return map;
  for (const id of ids) {
    map[id] = { ...map[id], starred: true };
  }
  return map;
}

export function listMailbox(): Record<string, MailboxFlags> {
  return seedFromLegacyStars(readJson<Record<string, MailboxFlags>>(KEY, {}));
}

function sanitizeLabels(labels?: string[]): MailLabel[] | undefined {
  if (!labels?.length) return undefined;
  const next = labels.filter((item): item is MailLabel => KNOWN_LABELS.has(item));
  return next.length ? next : undefined;
}

export function flagsFor(id: string, email?: Email): MailboxFlags {
  void email;
  const stored = listMailbox()[id] ?? {};
  return { ...stored, labels: sanitizeLabels(stored.labels) ?? [] };
}

export function notifyMailbox() {
  emit();
}

export function patchMailbox(id: string, patch: Partial<MailboxFlags>) {
  const map = listMailbox();
  const next = { ...map[id], ...patch };
  if (patch.labels !== undefined) next.labels = patch.labels;
  if (patch.folderId === "") delete next.folderId;
  map[id] = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
  emit();
  return next;
}

export function toggleMailboxFlag(
  id: string,
  key: "starred" | "archived" | "important" | "spam" | "trash" | "pinned",
) {
  const current = listMailbox()[id]?.[key] ?? false;
  return patchMailbox(id, { [key]: !current });
}

export function setMailboxFlag(
  id: string,
  key: "starred" | "archived" | "important" | "spam" | "trash" | "pinned",
  value: boolean,
) {
  const extra: Partial<MailboxFlags> = { [key]: value };
  if (value && key === "trash") {
    extra.archived = false;
    extra.spam = false;
  }
  if (value && key === "spam") extra.archived = false;
  if (value && key === "archived") extra.trash = false;
  return patchMailbox(id, extra);
}

export function toggleLabel(id: string, label: MailLabel, email?: Email) {
  void email;
  const current = sanitizeLabels(listMailbox()[id]?.labels) ?? [];
  const next = current.includes(label)
    ? current.filter((item) => item !== label)
    : [...current, label];
  return patchMailbox(id, { labels: next });
}

export function clearLabels(id: string) {
  return patchMailbox(id, { labels: [] });
}

export function restoreToInbox(id: string) {
  return patchMailbox(id, {
    trash: false,
    spam: false,
    archived: false,
    folderId: "",
  });
}

export function moveToCustomFolder(id: string, folderId: string | null) {
  return patchMailbox(id, {
    folderId: folderId ?? "",
    trash: false,
    spam: false,
    archived: false,
  });
}

export function setFocusOverride(id: string, view: "focused" | "other") {
  return patchMailbox(id, { focusOverride: view });
}

export function onMailboxChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function isHiddenFromFolder(flags: MailboxFlags, folder: MailFolder) {
  if (folder === "trash") return !flags.trash;
  if (folder === "spam") return !flags.spam;
  if (folder === "archive") return !flags.archived || Boolean(flags.trash);
  if (flags.trash || flags.spam) return true;
  if (flags.folderId && (folder === "inbox" || folder === "all")) return true;
  if (flags.archived && folder !== "all" && folder !== "starred" && folder !== "important") {
    return true;
  }
  return false;
}

export function emailMatchesFolder(
  email: Email,
  folder: MailFolder,
  flags: MailboxFlags,
) {
  if (isHiddenFromFolder(flags, folder)) return false;
  if (folder === "all") return true;
  if (folder === "starred") return Boolean(flags.starred);
  if (folder === "important") return Boolean(flags.important);
  if (folder === "archive") return Boolean(flags.archived);
  if (folder === "trash") return Boolean(flags.trash);
  if (folder === "spam") return Boolean(flags.spam);
  if (folder === "drafts") return email.status === "Draft";
  if (folder === "scheduled") return email.status === "Scheduled";
  if (folder === "sent") {
    return isOutbound(email) && email.status !== "Draft" && email.status !== "Scheduled";
  }
  if (folder === "inbox") {
    return (
      !isOutbound(email) &&
      email.status !== "Draft" &&
      email.status !== "Scheduled"
    );
  }
  return email.status !== "Draft" && email.status !== "Scheduled";
}

export function emailMatchesCustomFolder(
  folderId: string,
  flags: MailboxFlags,
) {
  if (flags.trash || flags.spam) return false;
  return flags.folderId === folderId;
}

export function contactName(email: Email) {
  if (email.relatedTo) {
    return email.relatedTo.replace(/^(Lead|Contact|Deal|Company):\s*/i, "");
  }
  const source = email.from || email.to[0] || "Unknown";
  if (!source.includes("@")) return source;
  return (source.split("@")[0] ?? source)
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function contactAddress(email: Email) {
  const candidates = [email.from, ...email.to, ...(email.cc ?? [])];
  return (
    candidates.find((item) => item.includes("@") && !isOurAddress(item)) ??
    candidates.find((item) => item.includes("@"))
  );
}
