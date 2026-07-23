"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Home,
  FolderOpen,
  Plus,
  Search,
  FileText,
  Download,
  Tag,
  Link2,
  Share2,
  History,
  X,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import {
  ACCESS_LEVELS,
  LIBRARY_FOLDERS,
  libraryDocuments as seedDocs,
  readExtraLibraryDocs,
  type DocumentAccessLevel,
  type LibraryDocument,
  type LibraryFolder,
} from "@/lib/documents/library/types";
import {
  ACTIVITY_OWNERS,
  RELATED_ENTITY_KINDS,
  RELATED_RECORD_OPTIONS,
  avatarColor,
  initials,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import {
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";
import { softDeleteRecord } from "@/lib/rules";

const ACCESS_STYLE: Record<DocumentAccessLevel, string> = {
  Private: "bg-slate-100 text-slate-600",
  Team: "bg-violet-50 text-violet-700",
  Organization: "bg-emerald-50 text-emerald-700",
};

export default function DocumentLibraryPage() {
  const [docs, setDocs] = useState<LibraryDocument[]>(seedDocs);
  const [folder, setFolder] = useState<LibraryFolder>("All Files");
  const [search, setSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState<DocumentAccessLevel | "All">(
    "All",
  );
  const [selected, setSelected] = useState<LibraryDocument | null>(null);
  const [drawer, setDrawer] = useState<"versions" | "upload" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    const extras = readExtraLibraryDocs();
    if (extras.length) {
      setDocs((prev) => {
        const ids = new Set(prev.map((d) => d.id));
        return [...extras.filter((e) => !ids.has(e.id)), ...prev];
      });
    }
  }, []);

  const folderCounts = useMemo(() => {
    const map: Record<string, number> = { "All Files": docs.length };
    for (const f of LIBRARY_FOLDERS) {
      if (f === "All Files") continue;
      map[f] = docs.filter((d) => d.folder === f).length;
    }
    return map;
  }, [docs]);

  const filtered = useMemo(() => {
    let data = docs;
    if (folder !== "All Files") data = data.filter((d) => d.folder === folder);
    if (accessFilter !== "All")
      data = data.filter((d) => d.accessLevel === accessFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (d) =>
          d.fileName.toLowerCase().includes(q) ||
          d.owner.toLowerCase().includes(q) ||
          (d.relatedTo?.toLowerCase().includes(q) ?? false) ||
          d.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return data;
  }, [docs, folder, accessFilter, search]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function openVersions(doc: LibraryDocument) {
    setSelected(doc);
    setDrawer("versions");
    setMenuId(null);
  }

  function renameDoc(doc: LibraryDocument) {
    const name = window.prompt("Rename file", doc.fileName);
    if (!name?.trim()) return;
    setDocs((prev) =>
      prev.map((d) =>
        d.id === doc.id ? { ...d, fileName: name.trim() } : d,
      ),
    );
    flash("File renamed");
    setMenuId(null);
  }

  function moveDoc(doc: LibraryDocument) {
    const options = LIBRARY_FOLDERS.filter((f) => f !== "All Files").join(", ");
    const next = window.prompt(`Move to folder (${options})`, doc.folder);
    if (!next || !LIBRARY_FOLDERS.includes(next as LibraryFolder)) return;
    if (next === "All Files") return;
    setDocs((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, folder: next } : d)),
    );
    flash(`Moved to ${next}`);
    setMenuId(null);
  }

  function shareDoc(doc: LibraryDocument) {
    const url = `${window.location.origin}/documents/library?file=${doc.id}`;
    void navigator.clipboard?.writeText(url);
    flash("Share link copied");
    setMenuId(null);
  }

  function downloadDoc(doc: LibraryDocument) {
    flash(`Download started: ${doc.fileName}`);
    setMenuId(null);
  }

  function deleteDoc(doc: LibraryDocument) {
    if (!window.confirm(`Delete ${doc.fileName}?`)) return;
    const gate = softDeleteRecord({
      action: "documents.library.delete",
      module: "documents.library",
      recordId: doc.id,
      recordLabel: doc.fileName,
      recordType: "Library Document",
      snapshot: doc,
    });
    if (!gate.ok) {
      flash(gate.message);
      return;
    }
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    flash("Moved to Recycle Bin");
    setMenuId(null);
  }

  function handleUploaded(doc: LibraryDocument) {
    setDocs((prev) => [doc, ...prev]);
    setDrawer(null);
    flash("File uploaded to library");
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />

      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <span className="text-slate-500">Documents</span>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Library
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <FolderOpen className="h-2.5 w-2.5" />
              Central store
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDrawer("upload")}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Upload
          </button>
        </div>

        <div className="flex min-h-[calc(100dvh-7.5rem)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]">
          {/* Folder rail */}
          <aside className="hidden w-[200px] shrink-0 flex-col border-r border-slate-100 bg-slate-50/50 sm:flex">
            <p className="px-3 pt-3 pb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Folders
            </p>
            <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
              {LIBRARY_FOLDERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFolder(f)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-all",
                    folder === f
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-slate-600 hover:bg-white/70",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5 opacity-60" />
                    {f}
                  </span>
                  <span className="text-[10px] tabular-nums text-slate-400">
                    {folderCounts[f] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
              <div className="flex items-center gap-2 sm:hidden">
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value as LibraryFolder)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px]"
                >
                  {LIBRARY_FOLDERS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <p className="hidden text-[12px] font-semibold text-slate-700 sm:block">
                {folder}
                <span className="ml-1.5 font-normal text-slate-400">
                  · {filtered.length} file{filtered.length === 1 ? "" : "s"}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-0.5 rounded-lg bg-slate-50 p-0.5">
                  {(["All", ...ACCESS_LEVELS] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAccessFilter(a)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] font-semibold",
                        accessFilter === a
                          ? "bg-violet-600 text-white"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search files, tags…"
                    className="h-8 w-40 rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[11px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] sm:w-52"
                  />
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[900px] text-left text-[12px]">
                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">File name</th>
                    <th className="px-4 py-2.5">Folder</th>
                    <th className="px-4 py-2.5">Owner</th>
                    <th className="px-4 py-2.5">Related To</th>
                    <th className="px-4 py-2.5">Version</th>
                    <th className="px-4 py-2.5">Tags</th>
                    <th className="px-4 py-2.5">Uploaded</th>
                    <th className="px-4 py-2.5">Access</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((doc) => (
                    <tr
                      key={doc.id}
                      className="transition-colors hover:bg-violet-50/40"
                    >
                      <td className="max-w-[220px] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-violet-500" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {doc.fileName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {doc.sizeLabel}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{doc.folder}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold",
                              avatarColor(doc.owner),
                            )}
                          >
                            {initials(doc.owner)}
                          </span>
                          {doc.owner}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {doc.relatedTo ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openVersions(doc)}
                          className="font-semibold text-violet-700 hover:underline"
                        >
                          v{doc.version}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {doc.uploadedAt}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            ACCESS_STYLE[doc.accessLevel],
                          )}
                        >
                          {doc.accessLevel}
                        </span>
                      </td>
                      <td className="relative px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setMenuId(menuId === doc.id ? null : doc.id)
                          }
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuId === doc.id ? (
                          <div className="absolute right-4 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                            <MenuItem
                              icon={Download}
                              label="Download"
                              onClick={() => downloadDoc(doc)}
                            />
                            <MenuItem
                              icon={History}
                              label="Version history"
                              onClick={() => openVersions(doc)}
                            />
                            <MenuItem
                              icon={Pencil}
                              label="Rename"
                              onClick={() => renameDoc(doc)}
                            />
                            <MenuItem
                              icon={FolderOpen}
                              label="Move"
                              onClick={() => moveDoc(doc)}
                            />
                            <MenuItem
                              icon={Share2}
                              label="Share"
                              onClick={() => shareDoc(doc)}
                            />
                            <MenuItem
                              icon={X}
                              label="Delete"
                              onClick={() => deleteDoc(doc)}
                              danger
                            />
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-16 text-center text-sm text-slate-400"
                      >
                        No files in this view.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {drawer === "versions" && selected ? (
        <Drawer onClose={() => setDrawer(null)} title="Version history">
          <p className="mb-3 truncate text-[13px] font-semibold text-slate-900">
            {selected.fileName}
          </p>
          <ol className="space-y-2">
            {[...selected.versions].reverse().map((v) => (
              <li
                key={v.version}
                className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-violet-700">
                    v{v.version}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {v.sizeLabel}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {v.uploadedAt} · {v.uploadedBy}
                </p>
                {v.note ? (
                  <p className="mt-1 text-[11px] text-slate-400">{v.note}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </Drawer>
      ) : null}

      {drawer === "upload" ? (
        <Drawer onClose={() => setDrawer(null)} title="Upload file">
          <UploadForm
            onCancel={() => setDrawer(null)}
            onSave={handleUploaded}
          />
        </Drawer>
      ) : null}

      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium",
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/20 backdrop-blur-[1px]">
      <button
        type="button"
        className="flex-1 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function UploadForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (doc: LibraryDocument) => void;
}) {
  const [fileName, setFileName] = useState("");
  const [folder, setFolder] = useState("Clients");
  const [owner, setOwner] = useState<string>(ACTIVITY_OWNERS[0]);
  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind | "">("");
  const [relatedName, setRelatedName] = useState("");
  const [tags, setTags] = useState("");
  const [accessLevel, setAccessLevel] =
    useState<DocumentAccessLevel>("Team");
  const [error, setError] = useState("");

  const relatedOptions = relatedKind
    ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === relatedKind)
    : RELATED_RECORD_OPTIONS;

  function submit() {
    if (!fileName.trim()) {
      setError("File name is required");
      return;
    }
    const today = new Date().toLocaleDateString("en-AU");
    const relatedTo =
      relatedKind && relatedName ? `${relatedKind}: ${relatedName}` : undefined;
    onSave({
      id: `lib-${Date.now()}`,
      fileName: fileName.trim(),
      folder,
      owner,
      relatedTo,
      version: 1,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      uploadedAt: today,
      accessLevel,
      sizeLabel: "120 KB",
      versions: [
        {
          version: 1,
          uploadedAt: today,
          uploadedBy: owner,
          sizeLabel: "120 KB",
          note: "Uploaded",
        },
      ],
    });
  }

  return (
    <div className="space-y-3">
      <Field label="File name" required error={error}>
        <InputShell icon={FileText} error={!!error}>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Contract.pdf"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>
      <Field label="Folder">
        <InputShell icon={FolderOpen}>
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className={elevatedSelectClass(true)}
          >
            {LIBRARY_FOLDERS.filter((f) => f !== "All Files").map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Owner">
        <InputShell>
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className={elevatedSelectClass()}
          >
            {ACTIVITY_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Related kind">
        <InputShell icon={Link2}>
          <select
            value={relatedKind}
            onChange={(e) => {
              setRelatedKind(e.target.value as RelatedEntityKind | "");
              setRelatedName("");
            }}
            className={elevatedSelectClass(true)}
          >
            <option value="">None</option>
            {RELATED_ENTITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Related record">
        <InputShell>
          <select
            value={relatedName}
            onChange={(e) => setRelatedName(e.target.value)}
            disabled={!relatedKind}
            className={elevatedSelectClass()}
          >
            <option value="">Select…</option>
            {relatedOptions.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Tags">
        <InputShell icon={Tag}>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="legal, kyc (comma separated)"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>
      <Field label="Access level">
        <InputShell>
          <select
            value={accessLevel}
            onChange={(e) =>
              setAccessLevel(e.target.value as DocumentAccessLevel)
            }
            className={elevatedSelectClass()}
          >
            {ACCESS_LEVELS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 flex-1 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          className="h-9 flex-1 rounded-lg bg-violet-600 text-[12px] font-semibold text-white"
        >
          Upload
        </button>
      </div>
    </div>
  );
}
