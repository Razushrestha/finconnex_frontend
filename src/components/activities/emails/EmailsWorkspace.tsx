"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Filter,
  Flag,
  Folder,
  Inbox,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  FileText,
  History,
  List,
} from "lucide-react";
import { EmailListTable } from "@/components/activities/emails/EmailListTable";
import { EmailsTimelineView } from "@/components/activities/emails/EmailsTimelineView";
import { EmailCopilotPanel } from "@/components/activities/emails/EmailCopilotPanel";
import {
  EMPTY_MAIL_FILTERS,
  EmailsFilterPanel,
  type MailListFilters,
} from "@/components/activities/emails/EmailsFilterPanel";
import {
  contactName,
  emailMatchesCustomFolder,
  emailMatchesFolder,
  flagsFor,
  MAIL_LABELS,
  onMailboxChange,
  type MailFolder,
  type MailLabel,
} from "@/lib/emails/mailbox";
import {
  createUserFolder,
  listUserFolders,
  type MailUserFolder,
} from "@/lib/emails/folders";
import { classifyFocus, type FocusView } from "@/lib/emails/outlook";
import { listEmails } from "@/lib/emails/store";
import { onRulesChange } from "@/lib/rules";
import { cn } from "@/lib/utils";
import type { Email } from "@/lib/emails/types";

const FOLDERS: {
  id: MailFolder;
  label: string;
  icon: typeof Inbox;
  badge?: "pink" | "orange";
}[] = [
  { id: "inbox", label: "Inbox", icon: Inbox, badge: "pink" },
  { id: "sent", label: "Sent", icon: Send },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "spam", label: "Spam", icon: AlertTriangle, badge: "pink" },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "important", label: "Important", icon: Flag },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "starred", label: "Starred", icon: Star, badge: "orange" },
];

function folderEmails(emails: Email[], folder: MailFolder) {
  return emails.filter((email) =>
    emailMatchesFolder(email, folder, flagsFor(email.id, email)),
  );
}

function isUnread(email: Email) {
  return email.status !== "Opened";
}

export function EmailsWorkspace() {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const [folder, setFolder] = useState<MailFolder>("inbox");
  const [customFolderId, setCustomFolderId] = useState<string | null>(null);
  const [focusView, setFocusView] = useState<FocusView>("focused");
  const [labelFilter, setLabelFilter] = useState<MailLabel | null>(null);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [filters, setFilters] = useState<MailListFilters>(EMPTY_MAIL_FILTERS);
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [mailView, setMailView] = useState<"list" | "timeline">("list");

  useEffect(() => {
    const offRules = onRulesChange(() => setRevision((n) => n + 1));
    const offMail = onMailboxChange(() => setRevision((n) => n + 1));
    return () => {
      offRules();
      offMail();
    };
  }, []);

  const emails = useMemo(() => {
    void revision;
    return listEmails();
  }, [revision]);

  const userFolders = useMemo(() => {
    void revision;
    return listUserFolders();
  }, [revision]);

  const counts = useMemo(() => {
    const next = {} as Record<MailFolder, number>;
    for (const item of FOLDERS) {
      next[item.id] = folderEmails(emails, item.id).length;
    }
    return next;
  }, [emails]);

  const inboxAll = useMemo(() => folderEmails(emails, "inbox"), [emails]);
  const focusedInbox = useMemo(
    () => inboxAll.filter((email) => classifyFocus(email) === "focused"),
    [inboxAll],
  );
  const otherInbox = useMemo(
    () => inboxAll.filter((email) => classifyFocus(email) === "other"),
    [inboxAll],
  );

  const labelCounts = useMemo(() => {
    const next = Object.fromEntries(MAIL_LABELS.map((item) => [item.id, 0])) as Record<
      MailLabel,
      number
    >;
    for (const email of emails) {
      const flags = flagsFor(email.id, email);
      if (flags.trash || flags.spam) continue;
      for (const label of flags.labels ?? []) next[label] += 1;
    }
    return next;
  }, [emails]);

  const folderCounts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const item of userFolders) {
      next[item.id] = emails.filter((email) =>
        emailMatchesCustomFolder(item.id, flagsFor(email.id, email)),
      ).length;
    }
    return next;
  }, [emails, userFolders]);

  const source = useMemo(() => {
    if (customFolderId) {
      return emails.filter((email) =>
        emailMatchesCustomFolder(customFolderId, flagsFor(email.id, email)),
      );
    }
    if (folder === "inbox") {
      return focusView === "other" ? otherInbox : focusedInbox;
    }
    return folderEmails(emails, folder);
  }, [emails, folder, customFolderId, focusView, focusedInbox, otherInbox]);

  const visible = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase();
    return source.filter((email) => {
      const flags = flagsFor(email.id, email);
      if (labelFilter && !flags.labels?.includes(labelFilter)) return false;
      if (filters.unreadOnly && !isUnread(email)) return false;
      if (filters.hasAttachment && !email.templateUsed) return false;
      if (filters.statuses.length && !filters.statuses.includes(email.status)) {
        return false;
      }
      if (!q) return true;
      return `${contactName(email)} ${email.subject} ${email.body} ${email.from} ${email.to.join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [source, labelFilter, appliedQuery, filters]);

  const activeFolder = userFolders.find((item) => item.id === customFolderId);
  const folderLabel = activeFolder
    ? activeFolder.name
    : folder === "inbox"
      ? focusView === "other"
        ? "Other"
        : "Focused"
      : FOLDERS.find((item) => item.id === folder)?.label ?? "Inbox";

  const filterCount =
    Number(filters.unreadOnly) +
    Number(filters.hasAttachment) +
    filters.statuses.length;

  function compose() {
    router.push("/activities/emails/create");
  }

  function selectSystemFolder(id: MailFolder) {
    setFolder(id);
    setCustomFolderId(null);
    setLabelFilter(null);
    if (id === "inbox") setFocusView("focused");
  }

  function selectUserFolder(item: MailUserFolder) {
    setCustomFolderId(item.id);
    setLabelFilter(null);
  }

  function addFolder() {
    const created = createUserFolder(folderName);
    if (!created) return;
    setFolderName("");
    setCreatingFolder(false);
    setCustomFolderId(created.id);
  }

  function syncNow() {
    setSyncing(true);
    window.setTimeout(() => {
      setRevision((n) => n + 1);
      setSyncedAt(
        new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }),
      );
      setSyncing(false);
    }, 700);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="p-3">
            <button
              type="button"
              onClick={() => compose()}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold text-white"
              style={{ backgroundColor: "#5A32A3" }}
            >
              <Plus className="h-4 w-4" />
              Compose Mail
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            <p className="px-2 pb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Mails
            </p>
            {FOLDERS.map((item) => {
              const Icon = item.icon;
              const count = counts[item.id] ?? 0;
              const active = folder === item.id && !customFolderId && !labelFilter;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectSystemFolder(item.id)}
                  className={cn(
                    "mb-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px]",
                    active
                      ? "bg-[#F3ECFB] font-semibold text-[#5A32A3]"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] font-bold",
                        item.badge === "orange"
                          ? "bg-orange-100 text-orange-700"
                          : item.badge === "pink"
                            ? "bg-pink-100 text-pink-700"
                            : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {count.toLocaleString()}
                    </span>
                  ) : null}
                </button>
              );
            })}

            <div className="mt-3 flex items-center justify-between px-2 pb-1">
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Folders
              </p>
              <button
                type="button"
                onClick={() => setCreatingFolder((v) => !v)}
                className="text-[10px] font-semibold text-[#5A32A3]"
              >
                + New
              </button>
            </div>
            {creatingFolder ? (
              <form
                className="mb-1 flex gap-1 px-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  addFolder();
                }}
              >
                <input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-[11px] outline-none"
                />
                <button
                  type="submit"
                  className="h-8 rounded-lg px-2 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: "#5A32A3" }}
                >
                  Add
                </button>
              </form>
            ) : null}
            {userFolders.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectUserFolder(item)}
                className={cn(
                  "mb-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px]",
                  customFolderId === item.id
                    ? "bg-[#F3ECFB] font-semibold text-[#5A32A3]"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <Folder className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="text-[10px] text-slate-400">
                  {folderCounts[item.id] || ""}
                </span>
              </button>
            ))}

            <p className="mt-3 px-2 pb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Labels
            </p>
            {MAIL_LABELS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setLabelFilter((prev) => (prev === item.id ? null : item.id))
                }
                className={cn(
                  "mb-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px]",
                  labelFilter === item.id
                    ? "bg-[#F3ECFB] font-semibold text-[#5A32A3]"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", item.dot)} />
                <span className="min-w-0 flex-1 truncate">{item.id}</span>
                <span className="text-[10px] text-slate-400">
                  {labelCounts[item.id] || ""}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
            <form
              className="flex h-11 min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white"
              onSubmit={(e) => {
                e.preventDefault();
                setAppliedQuery(query);
              }}
            >
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value.trim()) setAppliedQuery("");
                }}
                placeholder="Search Email"
                className="min-w-0 flex-1 px-4 text-[13px] outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-full items-center gap-1.5 px-5 text-[12px] font-semibold text-white"
                style={{ backgroundColor: "#5A32A3" }}
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </button>
            </form>
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold",
                filterOpen || filterCount
                  ? "border-violet-200 bg-violet-50 text-[#5A32A3]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
              {filterCount ? (
                <span className="rounded-full bg-[#5A32A3] px-1.5 text-[10px] text-white">
                  {filterCount}
                </span>
              ) : null}
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="List view"
                aria-label="List view"
                onClick={() => setMailView("list")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border",
                  mailView === "list"
                    ? "border-violet-200 bg-[#F3ECFB] text-[#5A32A3]"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Timeline"
                aria-label="Timeline"
                onClick={() => setMailView("timeline")}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium",
                  mailView === "timeline"
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700",
                )}
              >
                <History className="h-3.5 w-3.5" />
                Timeline
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAiOpen((v) => !v)}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold",
                aiOpen
                  ? "border-violet-200 bg-violet-50 text-[#5A32A3]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI
            </button>
            <button
              type="button"
              onClick={syncNow}
              disabled={syncing}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : syncedAt ? `Synced ${syncedAt}` : "Sync"}
            </button>
          </div>

          {folder === "inbox" && !customFolderId ? (
            <div className="mb-2 flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setFocusView("focused")}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-semibold",
                  focusView === "focused"
                    ? "bg-[#5A32A3] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                Focused
                <span className="ml-1.5 text-[10px] opacity-80">{focusedInbox.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setFocusView("other")}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-semibold",
                  focusView === "other"
                    ? "bg-[#5A32A3] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                Other
                <span className="ml-1.5 text-[10px] opacity-80">{otherInbox.length}</span>
              </button>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
            {filterOpen ? (
              <EmailsFilterPanel
                value={filters}
                onChange={setFilters}
                onClose={() => setFilterOpen(false)}
              />
            ) : null}
            {aiOpen ? (
              <EmailCopilotPanel emails={emails} onClose={() => setAiOpen(false)} />
            ) : null}
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
              {mailView === "timeline" ? (
                <EmailsTimelineView emails={visible} />
              ) : (
                <EmailListTable
                  key={`${folder}-${customFolderId ?? ""}-${focusView}-${labelFilter ?? ""}`}
                  data={visible}
                  folderLabel={labelFilter ?? folderLabel}
                  folder={customFolderId ? "all" : folder}
                  customFolderId={customFolderId}
                  onCompose={() => compose()}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
