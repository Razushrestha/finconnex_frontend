"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Folder,
  FolderOpen,
  Home,
  Paperclip,
  Plus,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  ATTACHMENT_KINDS,
  type Attachment,
  type AttachmentKind,
} from "@/lib/attachments/types";
import {
  createAttachment,
  listAttachments,
} from "@/lib/attachments/store";
import {
  ACTIVITY_OWNERS,
  RELATED_RECORD_OPTIONS,
  initials,
  avatarColor,
} from "@/lib/activities/shared";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";

/** "Lead: William Anderson" → "William Anderson" */
export function clientNameFromRelatedTo(relatedTo?: string): string {
  if (!relatedTo?.trim()) return "Unassigned";
  const m = relatedTo.trim().match(/^([^:]+):\s*(.+)$/);
  if (m?.[2]) return m[2].trim();
  return relatedTo.trim();
}

/** "William Anderson" + Lead → "Lead: William Anderson" */
export function relatedToFromClient(
  clientName: string,
  kind = "Lead",
): string {
  const name = clientName.trim();
  if (!name || name === "Unassigned") return "";
  if (/^[^:]+:\s*.+/.test(name)) return name;
  return `${kind}: ${name}`;
}

type ClientFolder = {
  name: string;
  relatedLabel: string;
  files: Attachment[];
};

function readQueryBootstrap() {
  if (typeof window === "undefined") {
    return { relatedTo: "", composeOpen: false, folder: null as string | null };
  }
  const params = new URLSearchParams(window.location.search);
  const relatedName = params.get("relatedName");
  const relatedKind = params.get("relatedKind") || "Lead";
  const relatedTo = relatedName ? `${relatedKind}: ${relatedName}` : "";
  return {
    relatedTo,
    composeOpen: params.get("compose") === "1",
    folder: relatedName ? relatedName.trim() : null,
  };
}

export default function AttachmentsPage() {
  const bootstrap = useMemo(() => readQueryBootstrap(), []);
  const [items, setItems] = useState<Attachment[]>(() =>
    typeof window === "undefined" ? [] : listAttachments(),
  );
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(
    bootstrap.folder,
  );
  const [composeOpen, setComposeOpen] = useState(bootstrap.composeOpen);
  const [fileName, setFileName] = useState("");
  const [kind, setKind] = useState<AttachmentKind>("Document");
  const [clientName, setClientName] = useState(
    bootstrap.relatedTo
      ? clientNameFromRelatedTo(bootstrap.relatedTo)
      : "",
  );
  const [relatedKind, setRelatedKind] = useState("Lead");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function refresh() {
    setItems(listAttachments());
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }

  const folders = useMemo((): ClientFolder[] => {
    const map = new Map<string, ClientFolder>();
    for (const a of items) {
      const name = clientNameFromRelatedTo(a.relatedTo);
      const existing = map.get(name);
      if (existing) {
        existing.files.push(a);
      } else {
        map.set(name, {
          name,
          relatedLabel: a.relatedTo || name,
          files: [a],
        });
      }
    }
    return [...map.values()].sort((a, b) => {
      if (a.name === "Unassigned") return 1;
      if (b.name === "Unassigned") return -1;
      return a.name.localeCompare(b.name);
    });
  }, [items]);

  const q = search.trim().toLowerCase();

  const visibleFolders = useMemo(() => {
    if (!q) return folders;
    return folders.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.files.some(
          (a) =>
            a.fileName.toLowerCase().includes(q) ||
            a.uploadedBy.toLowerCase().includes(q),
        ),
    );
  }, [folders, q]);

  const openFolder = useMemo(
    () => folders.find((f) => f.name === activeFolder) ?? null,
    [folders, activeFolder],
  );

  const folderFiles = useMemo(() => {
    if (!openFolder) return [];
    if (!q) return openFolder.files;
    return openFolder.files.filter(
      (a) =>
        a.fileName.toLowerCase().includes(q) ||
        a.uploadedBy.toLowerCase().includes(q) ||
        (a.relatedTo ?? "").toLowerCase().includes(q),
    );
  }, [openFolder, q]);

  function openUpload(forFolder?: string | null) {
    const folder = forFolder ?? activeFolder;
    if (folder && folder !== "Unassigned") {
      setClientName(folder);
      const hit = RELATED_RECORD_OPTIONS.find((r) => r.name === folder);
      setRelatedKind(hit?.kind ?? "Lead");
    } else if (!bootstrap.relatedTo) {
      setClientName("");
    }
    setComposeOpen(true);
  }

  function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!fileName.trim()) return;
    if (!clientName.trim()) {
      flash("Choose a client folder name");
      return;
    }
    const relatedTo = relatedToFromClient(clientName, relatedKind);
    createAttachment({
      fileName: fileName.trim(),
      kind,
      relatedTo: relatedTo || undefined,
      uploadedBy: ACTIVITY_OWNERS[0],
      notes: notes || undefined,
    });
    const folder = clientNameFromRelatedTo(relatedTo);
    setFileName("");
    setNotes("");
    setComposeOpen(false);
    refresh();
    setActiveFolder(folder);
    flash(`Uploaded to ${folder}`);
  }

  const clientOptions = useMemo(() => {
    const names = new Set<string>();
    for (const r of RELATED_RECORD_OPTIONS) names.add(r.name);
    for (const f of folders) {
      if (f.name !== "Unassigned") names.add(f.name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [folders]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <FocusHighlight />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Home className="h-3 w-3" />
            <span>Activities</span>
            <span>/</span>
            <button
              type="button"
              onClick={() => setActiveFolder(null)}
              className={cn(
                "hover:text-slate-700",
                !activeFolder ? "font-medium text-slate-600" : "text-slate-400",
              )}
            >
              Attachments
            </button>
            {activeFolder && (
              <>
                <span>/</span>
                <span className="font-medium text-slate-600">{activeFolder}</span>
              </>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {activeFolder ? activeFolder : "Attachments"}
          </h1>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {activeFolder
              ? `Files in ${activeFolder}'s folder`
              : "One folder per client. Open a folder to see their documents, or upload into a client folder."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFolder && (
            <button
              type="button"
              onClick={() => setActiveFolder(null)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All folders
            </button>
          )}
          <button
            type="button"
            onClick={() => openUpload(activeFolder)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {activeFolder ? `Upload to ${activeFolder}` : "Upload"}
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            activeFolder
              ? "Search files in this folder…"
              : "Search clients or files…"
          }
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-[13px] outline-none focus:ring-2 focus:ring-violet-300"
        />
      </div>

      {!activeFolder ? (
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleFolders.map((folder) => (
              <button
                key={folder.name}
                type="button"
                onClick={() => setActiveFolder(folder.name)}
                className="group flex flex-col items-start gap-3 rounded-xl border border-slate-100 bg-white p-3.5 text-left shadow-sm transition-colors hover:border-violet-200 hover:bg-violet-50/40"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100">
                    <Folder className="h-5 w-5" />
                  </span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColor(folder.name)}`}
                  >
                    {initials(folder.name)}
                  </span>
                </div>
                <div className="min-w-0 w-full">
                  <p className="truncate text-[13px] font-semibold text-slate-900">
                    {folder.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {folder.files.length}{" "}
                    {folder.files.length === 1 ? "file" : "files"}
                  </p>
                </div>
              </button>
            ))}
            {visibleFolders.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm text-slate-400">
                No client folders yet. Upload a file to create one.
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
            {visibleFolders.length} client{" "}
            {visibleFolders.length === 1 ? "folder" : "folders"} ·{" "}
            {items.length} files
            {" · "}
            <Link
              href="/sales/leads"
              className="font-medium text-violet-600 hover:underline"
            >
              Open Leads
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <FolderOpen className="h-4 w-4 text-amber-600" />
            <span className="text-[12px] font-semibold text-slate-800">
              {activeFolder}
            </span>
            <span className="text-[11px] text-slate-400">
              · {folderFiles.length}{" "}
              {folderFiles.length === 1 ? "file" : "files"}
            </span>
          </div>
          <table className="w-full min-w-[640px] text-left text-[12px]">
            <thead className="border-b border-slate-100 bg-white text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              <tr>
                <th className="px-3 py-2.5">File</th>
                <th className="px-3 py-2.5">Kind</th>
                <th className="px-3 py-2.5">Uploaded by</th>
                <th className="px-3 py-2.5">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              {folderFiles.map((a) => (
                <tr
                  key={a.id}
                  data-focus-id={a.id}
                  data-attachment-id={a.id}
                  className="hover:bg-slate-50/80"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                        <Paperclip className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {a.fileName}
                        </p>
                        {a.sizeLabel && (
                          <p className="text-[10px] text-slate-400">
                            {a.sizeLabel}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{a.kind}</td>
                  <td className="px-3 py-2.5 text-slate-600">{a.uploadedBy}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">
                    {a.uploadedAt}
                  </td>
                </tr>
              ))}
              {folderFiles.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-10 text-center text-slate-400"
                  >
                    No files in this folder yet.{" "}
                    <button
                      type="button"
                      onClick={() => openUpload(activeFolder)}
                      className="font-medium text-violet-600 hover:underline"
                    >
                      Upload one
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={onUpload}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Upload to client folder
              </h2>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-3 block text-xs font-medium text-slate-600">
              Client folder
              <div className="mt-1 flex gap-2">
                <select
                  value={relatedKind}
                  onChange={(e) => setRelatedKind(e.target.value)}
                  className="h-10 w-[110px] shrink-0 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-violet-300"
                >
                  <option value="Lead">Lead</option>
                  <option value="Contact">Contact</option>
                  <option value="Company">Company</option>
                  <option value="Deal">Deal</option>
                </select>
                <input
                  list="client-folder-options"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="e.g. Raju / William Anderson"
                  required
                />
                <datalist id="client-folder-options">
                  {clientOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Files land in a folder named after the client. New names create
                a new folder.
              </p>
            </label>

            <label className="mb-3 block text-xs font-medium text-slate-600">
              File name
              <input
                autoFocus
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="checklist.pdf"
                required
              />
            </label>
            <label className="mb-3 block text-xs font-medium text-slate-600">
              Kind
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as AttachmentKind)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
              >
                {ATTACHMENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-4 block text-xs font-medium text-slate-600">
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white"
              >
                Upload
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div
          className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
