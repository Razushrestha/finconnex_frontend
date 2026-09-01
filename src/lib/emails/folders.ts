import { notifyMailbox } from "@/lib/emails/mailbox";

export interface MailUserFolder {
  id: string;
  name: string;
}

const KEY = "finconnex.emails.folders.v1";

function read(): MailUserFolder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as MailUserFolder[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(folders: MailUserFolder[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(folders));
  } catch {
    /* ignore */
  }
  notifyMailbox();
}

export function listUserFolders(): MailUserFolder[] {
  return read();
}

export function createUserFolder(name: string): MailUserFolder | null {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return null;
  const folders = read();
  if (folders.some((item) => item.name.toLowerCase() === trimmed.toLowerCase())) {
    return folders.find((item) => item.name.toLowerCase() === trimmed.toLowerCase()) ?? null;
  }
  const folder: MailUserFolder = {
    id: `fld-${Date.now().toString(36)}`,
    name: trimmed,
  };
  write([folder, ...folders]);
  return folder;
}

export function deleteUserFolder(id: string) {
  write(read().filter((item) => item.id !== id));
}
