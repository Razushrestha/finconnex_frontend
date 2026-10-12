"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  downloadGoogleDriveFiles,
  listGoogleDrive,
  type DriveEntry,
} from "@/lib/documents/cloud/google-picker";
import { cn } from "@/lib/utils";

type SourceId =
  | "workdrive"
  | "dropbox"
  | "box"
  | "gdrive"
  | "onedrive"
  | "sharepoint";

const SOURCES: {
  id: SourceId;
  label: string;
  href: string;
  terms: string;
  privacy: string;
}[] = [
  {
    id: "workdrive",
    label: "WorkDrive",
    href: "https://workdrive.zoho.com/",
    terms: "https://www.zoho.com/terms.html",
    privacy: "https://www.zoho.com/privacy.html",
  },
  {
    id: "dropbox",
    label: "Dropbox",
    href: "https://www.dropbox.com/home",
    terms: "https://www.dropbox.com/terms",
    privacy: "https://www.dropbox.com/privacy",
  },
  {
    id: "box",
    label: "Box",
    href: "https://account.box.com/login",
    terms: "https://www.box.com/legal/termsofservice",
    privacy: "https://www.box.com/legal/privacypolicy",
  },
  {
    id: "gdrive",
    label: "Google Drive",
    href: "https://accounts.google.com/AccountChooser?hl=en&continue=https%3A%2F%2Fdrive.google.com%2Fdrive%2Fmy-drive",
    terms: "https://policies.google.com/terms",
    privacy: "https://policies.google.com/privacy",
  },
  {
    id: "onedrive",
    label: "OneDrive",
    href: "https://login.live.com/",
    terms: "https://www.microsoft.com/legal/terms-of-use",
    privacy: "https://privacy.microsoft.com/privacystatement",
  },
  {
    id: "sharepoint",
    label: "SharePoint",
    href: "https://login.microsoftonline.com/",
    terms: "https://www.microsoft.com/legal/terms-of-use",
    privacy: "https://privacy.microsoft.com/privacystatement",
  },
];

function ConnectAccount({
  label,
  terms,
  privacy,
  busy,
  onAuthenticate,
}: {
  label: string;
  terms: string;
  privacy: string;
  busy: boolean;
  onAuthenticate: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <ConnectScene />
      <h2 className="mt-2 text-[22px] font-semibold text-slate-900">Connect your account</h2>
      <p className="mt-3 text-[14px] leading-6 text-slate-500">
        By clicking on this button you agree to the provider&apos;s{" "}
        <a href={terms} target="_blank" rel="noreferrer" className="text-[#1a73e8] hover:underline">
          terms of use
        </a>{" "}
        and{" "}
        <a href={privacy} target="_blank" rel="noreferrer" className="text-[#1a73e8] hover:underline">
          privacy policy
        </a>
        , and understand that the rights to use this product do not come from FinConnex
      </p>
      <button
        type="button"
        onClick={onAuthenticate}
        disabled={busy}
        className="mt-6 inline-flex h-11 min-w-[220px] items-center justify-center rounded-md bg-[#226db4] px-6 text-[15px] font-medium text-white hover:bg-[#1d5f9e] disabled:opacity-70"
      >
        {busy ? "Opening…" : `Authenticate ${label}`}
      </button>
    </div>
  );
}

function ConnectScene() {
  return (
    <svg viewBox="0 0 280 150" className="h-36 w-64" aria-hidden>
      <rect x="118" y="18" width="92" height="62" rx="8" fill="#dbeafe" />
      <circle cx="164" cy="42" r="10" fill="#93c5fd" />
      <rect x="150" y="56" width="28" height="6" rx="3" fill="#bfdbfe" />
      <rect x="36" y="78" width="92" height="8" rx="2" fill="#cbd5e1" />
      <rect x="28" y="86" width="108" height="6" rx="2" fill="#e2e8f0" />
      <path d="M40 92h84v8H40z" fill="#94a3b8" />
      <circle cx="78" cy="58" r="12" fill="#d6b08c" />
      <path d="M58 96c2-22 40-22 42 0v6H58z" fill="#64748b" />
      <path d="M62 102h32l6 28H56z" fill="#94a3b8" />
      <rect x="48" y="128" width="16" height="6" rx="2" fill="#475569" />
      <rect x="96" y="128" width="16" height="6" rx="2" fill="#475569" />
      <path d="M118 36h28a16 16 0 0 1 0 32h-8l-6 8v-8h-14a16 16 0 0 1 0-32z" fill="#e0f2fe" stroke="#7dd3fc" />
      <circle cx="132" cy="52" r="7" fill="#22c55e" />
      <path d="M129 52l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" />
      <rect x="210" y="108" width="18" height="22" rx="3" fill="#bbf7d0" />
      <circle cx="219" cy="100" r="8" fill="#86efac" />
    </svg>
  );
}

type CloudFile = {
  key: string;
  name: string;
  size: number;
  modified: number;
  file: File;
};

function toCloudFile(file: File): CloudFile {
  return {
    key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    size: file.size,
    modified: file.lastModified || Date.now(),
    file,
  };
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatWhen(ms: number) {
  return new Date(ms)
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .replace(/,/g, "");
}

function pickLocalFiles(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt";
    let settled = false;
    const finish = (next: File[]) => {
      if (settled) return;
      settled = true;
      resolve(next);
    };
    input.addEventListener("change", () => finish(Array.from(input.files ?? [])));
    input.addEventListener("cancel", () => finish([]));
    window.setTimeout(() => {
      window.addEventListener(
        "focus",
        () => {
          window.setTimeout(() => finish([]), 500);
        },
        { once: true },
      );
    }, 400);
    input.click();
  });
}

function FilesAccess({
  label,
  busy,
  onSelect,
}: {
  label: string;
  busy: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <FolderLock />
      <h2 className="mt-4 text-[22px] font-semibold text-slate-900">Files access required</h2>
      <p className="mt-3 text-[15px] font-medium text-slate-800">
        FinConnex doesn&apos;t have access to {label} files
      </p>
      <p className="mt-1 text-[14px] text-slate-500">Select preferred files to allow access.</p>
      <button
        type="button"
        onClick={onSelect}
        disabled={busy}
        className="mt-6 inline-flex h-11 min-w-[148px] items-center justify-center rounded-md bg-[#1a56db] px-6 text-[15px] font-medium text-white hover:bg-[#1648b8] disabled:opacity-70"
      >
        {busy ? "Opening…" : "Select files"}
      </button>
      <p className="mt-3 text-[13px] text-slate-400">Opens {label} picker for selection</p>
    </div>
  );
}

function FolderLock() {
  return (
    <svg viewBox="0 0 180 140" className="h-32 w-40" aria-hidden>
      <path d="M28 52h78l14 14v52a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8V52z" fill="#dbe7fb" />
      <path d="M28 52h78v14H42z" fill="#c5d7f6" />
      <rect x="108" y="28" width="46" height="36" rx="6" fill="#e8eef8" stroke="#94a3b8" />
      <rect x="116" y="18" width="30" height="22" rx="10" fill="none" stroke="#64748b" strokeWidth="4" />
      <circle cx="131" cy="44" r="4" fill="#64748b" />
      <rect x="128" y="46" width="6" height="8" rx="1" fill="#64748b" />
    </svg>
  );
}

const PICKER_TABS: Record<SourceId, [string, string, string]> = {
  gdrive: ["Google Drive", "Shared drives", "Shared to me"],
  dropbox: ["All files", "Shared", "Recents"],
  box: ["All files", "Shared", "Recents"],
  onedrive: ["My files", "Shared", "Recent"],
  sharepoint: ["Documents", "Shared", "Recent"],
  workdrive: ["My folders", "Shared", "Recent"],
};

type PickerFolder = { id: string; name: string; files: File[] };

function DriveBrowser({
  source,
  label,
  onCancel,
  onConfirm,
}: {
  source: SourceId;
  label: string;
  onCancel: () => void;
  onConfirm: (files: File[]) => void;
}) {
  const tabs = PICKER_TABS[source];
  const [tab, setTab] = useState(tabs[0]);
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [sortAsc, setSortAsc] = useState(true);
  const [folders, setFolders] = useState<PickerFolder[]>([]);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [loose, setLoose] = useState<File[]>([]);
  const [marked, setMarked] = useState<string[]>([]);
  const [driveFolders, setDriveFolders] = useState<DriveEntry[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveEntry[]>([]);
  const [driveStack, setDriveStack] = useState<DriveEntry[]>([]);
  const [driveError, setDriveError] = useState("");
  const [driveLoading, setDriveLoading] = useState(false);
  const [drivePicked, setDrivePicked] = useState<string[]>([]);
  const remote = source === "gdrive";
  const needle = query.trim().toLowerCase();
  const mine = tab === tabs[0];
  const byName = (a: string, b: string) => (sortAsc ? a.localeCompare(b) : b.localeCompare(a));
  const visibleFolders = folders
    .filter((folder) => folder.name.toLowerCase().includes(needle))
    .sort((a, b) => byName(a.name, b.name));
  const filePool = openFolder
    ? (folders.find((folder) => folder.id === openFolder)?.files ?? [])
    : loose;
  const shown = filePool
    .filter((file) => file.name.toLowerCase().includes(needle))
    .sort((a, b) => byName(a.name, b.name));

  function toggleFile(key: string) {
    setMarked((prev) => (prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]));
  }

  function addFiles(next: File[]) {
    if (!next.length) return;
    setLoose((prev) => [...prev, ...next]);
    setMarked((prev) => [...prev, ...next.map((file) => fileKey(file))]);
    setOpenFolder(null);
    setTab(tabs[0]);
  }

  function addFolder(folder: PickerFolder) {
    setFolders((prev) => [...prev, folder]);
    setOpenFolder(folder.id);
    setMarked((prev) => [...prev, ...folder.files.map((file) => fileKey(file))]);
    setTab(tabs[0]);
  }

  const allFiles = [...loose, ...folders.flatMap((folder) => folder.files)];

  useEffect(() => {
    if (!remote) return;
    let cancel = false;
    const parent = driveStack[driveStack.length - 1]?.id;
    const mode = tab === tabs[1] ? "drives" : tab === tabs[2] ? "shared" : "mine";
    setDriveLoading(true);
    setDriveError("");
    void listGoogleDrive(mode, parent)
      .then((page) => {
        if (cancel) return;
        setDriveFolders(page.folders);
        setDriveFiles(page.files);
      })
      .catch((err) => {
        if (cancel) return;
        setDriveFolders([]);
        setDriveFiles([]);
        setDriveError(err instanceof Error ? err.message : "Could not load Google Drive.");
      })
      .finally(() => {
        if (!cancel) setDriveLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [remote, tab, tabs, driveStack]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex items-end gap-6 border-b border-slate-200 px-4">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={cn(
              "-mb-px border-b-2 px-1 py-3 text-[14px]",
              tab === name
                ? "border-[#1a73e8] font-medium text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder=""
          aria-label={`Search ${label}`}
          className="h-9 min-w-0 flex-1 rounded border border-slate-300 px-3 text-[13px] outline-none focus:border-[#1a73e8]"
        />
        <span className="inline-flex h-9 w-10 items-center justify-center rounded border border-slate-300 text-slate-500">
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
            <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13.2 13.2 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="ml-auto inline-flex overflow-hidden rounded border border-slate-300">
          <button
            type="button"
            aria-label="List view"
            onClick={() => setLayout("list")}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center",
              layout === "list" ? "bg-slate-100 text-slate-800" : "text-slate-500",
            )}
          >
            <ListIcon />
          </button>
          <button
            type="button"
            aria-label="Grid view"
            onClick={() => setLayout("grid")}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center border-l border-slate-300",
              layout === "grid" ? "bg-[#e8f0fe] text-[#1a73e8]" : "text-slate-500",
            )}
          >
            <GridIcon checked={layout === "grid"} />
          </button>
        </span>
        <button
          type="button"
          aria-label={sortAsc ? "Sort A to Z" : "Sort Z to A"}
          onClick={() => setSortAsc((prev) => !prev)}
          className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 text-slate-500"
        >
          <SortIcon />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-3">
        {mine || remote ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-slate-800">
                Folders{remote && driveStack.length ? ` / ${driveStack[driveStack.length - 1]?.name}` : ""}
              </p>
              {remote && driveStack.length ? (
                <button
                  type="button"
                  onClick={() => setDriveStack((prev) => prev.slice(0, -1))}
                  className="text-[12px] text-[#1a73e8] hover:underline"
                >
                  Back
                </button>
              ) : null}
              {!remote && openFolder ? (
                <button
                  type="button"
                  onClick={() => setOpenFolder(null)}
                  className="text-[12px] text-[#1a73e8] hover:underline"
                >
                  All folders
                </button>
              ) : null}
            </div>
            {driveError ? <p className="mb-3 text-[13px] text-rose-600">{driveError}</p> : null}
            {driveLoading ? <p className="mb-3 text-[13px] text-slate-500">Loading Google Drive…</p> : null}
            <div className={cn(layout === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" : "flex flex-col gap-2")}>
              {remote
                ? driveFolders
                    .filter((folder) => folder.name.toLowerCase().includes(needle))
                    .map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setDriveStack((prev) => [...prev, folder])}
                        className={cn(
                          "flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left hover:border-slate-300",
                          layout === "grid" ? "h-12" : "h-10",
                        )}
                      >
                        <FolderGlyph />
                        <span className="truncate text-[13px] text-slate-800">{folder.name}</span>
                      </button>
                    ))
                : null}
              {!remote && visibleFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setOpenFolder((current) => (current === folder.id ? null : folder.id))}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-lg border bg-white px-3 text-left",
                    layout === "grid" ? "h-12" : "h-10",
                    openFolder === folder.id ? "border-[#1a73e8] ring-1 ring-[#1a73e8]" : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <FolderGlyph />
                  <span className="truncate text-[13px] text-slate-800">{folder.name}</span>
                </button>
              ))}
              {remote ? null : (
              <button
                type="button"
                onClick={() => {
                  void pickDirectory().then((folder) => {
                    if (folder) addFolder(folder);
                  });
                }}
                className="flex h-12 items-center justify-center rounded-lg border border-dashed border-slate-300 px-3 text-[12px] text-slate-500 hover:border-[#1a73e8] hover:text-[#1a73e8]"
              >
                Add folder
              </button>
              )}
            </div>
            <p className="mb-2 mt-4 text-[13px] font-medium text-slate-800">Files</p>
            <div className={cn(layout === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" : "flex flex-col gap-2")}>
              {remote
                ? driveFiles
                    .filter((file) => file.name.toLowerCase().includes(needle))
                    .map((file) => {
                      const on = drivePicked.includes(file.id);
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() =>
                            setDrivePicked((prev) =>
                              prev.includes(file.id)
                                ? prev.filter((id) => id !== file.id)
                                : [...prev, file.id],
                            )
                          }
                          className={cn(
                            "flex flex-col overflow-hidden rounded-lg border bg-white text-left",
                            on ? "border-[#1a73e8] bg-[#e8f0fe] ring-1 ring-[#1a73e8]" : "border-slate-200 hover:border-slate-300",
                          )}
                        >
                          <span
                            className="relative block h-20 w-full"
                            style={{
                              backgroundImage:
                                "linear-gradient(45deg,#eceff3 25%,transparent 25%),linear-gradient(-45deg,#eceff3 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eceff3 75%),linear-gradient(-45deg,transparent 75%,#eceff3 75%)",
                              backgroundSize: "14px 14px",
                              backgroundPosition: "0 0,0 7px,7px -7px,-7px 0",
                              backgroundColor: "#f8fafc",
                            }}
                          >
                            <span className="absolute bottom-1 left-1 rounded bg-[#e11d48] px-1 py-0.5 text-[9px] font-bold text-white">
                              {file.name.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}
                            </span>
                          </span>
                          <span className="truncate px-2 py-1.5 text-[12px] text-slate-800">{file.name}</span>
                        </button>
                      );
                    })
                : null}
              {!remote && shown.map((file) => {
                const key = fileKey(file);
                return (
                  <FileTile
                    key={key}
                    file={file}
                    selected={marked.includes(key)}
                    layout={layout}
                    onClick={() => toggleFile(key)}
                  />
                );
              })}
              {remote ? null : (
              <button
                type="button"
                onClick={() => {
                  void pickLocalFiles().then(addFiles);
                }}
                className="flex h-[108px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-[12px] text-slate-500 hover:border-[#1a73e8] hover:text-[#1a73e8]"
              >
                Choose files
              </button>
              )}
            </div>
          </>
        ) : (
          <p className="py-16 text-center text-[13px] text-slate-400">No files in {tab}.</p>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3">
        <button
          type="button"
          disabled={remote ? drivePicked.length === 0 || driveLoading : marked.length === 0}
          onClick={() => {
            if (!remote) {
              onConfirm(allFiles.filter((file) => marked.includes(fileKey(file))));
              return;
            }
            const chosen = driveFiles.filter((file) => drivePicked.includes(file.id));
            setDriveLoading(true);
            void downloadGoogleDriveFiles(chosen)
              .then(onConfirm)
              .catch((err) => {
                setDriveError(err instanceof Error ? err.message : "Could not download those files.");
              })
              .finally(() => setDriveLoading(false));
          }}
          className={cn(
            "h-9 rounded px-4 text-[13px] font-medium",
            (remote ? drivePicked.length === 0 : marked.length === 0)
              ? "cursor-default bg-[#e8f0fe] text-[#8ab4f8]"
              : "bg-[#1a73e8] text-white hover:bg-[#1765cc]",
          )}
        >
          Select
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded border border-slate-300 bg-white px-4 text-[13px] text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function pickDirectory(): Promise<PickerFolder | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.setAttribute("webkitdirectory", "");
    let settled = false;
    const finish = (folder: PickerFolder | null) => {
      if (settled) return;
      settled = true;
      resolve(folder);
    };
    input.addEventListener("change", () => {
      const files = Array.from(input.files ?? []);
      if (!files.length) {
        finish(null);
        return;
      }
      const relative = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
      const name = relative.split(/[\\/]/)[0] || "Folder";
      finish({
        id: `${name}-${Date.now()}`,
        name,
        files,
      });
    });
    input.addEventListener("cancel", () => finish(null));
    input.click();
  });
}

function FolderGlyph() {
  return (
    <svg viewBox="0 0 20 16" className="h-4 w-5 shrink-0" aria-hidden>
      <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2H7l1.6 1.6H17.5A1.5 1.5 0 0 1 19 5.1v8.4A1.5 1.5 0 0 1 17.5 15h-15A1.5 1.5 0 0 1 1 13.5V3.5z" fill="#9aa0a6" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <path d="M2 3.5h12M2 8h12M2 12.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon({ checked }: { checked: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <rect x="1.5" y="1.5" width="5" height="5" rx="0.6" fill="none" stroke="currentColor" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="0.6" fill="none" stroke="currentColor" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="0.6" fill="none" stroke="currentColor" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.6" fill="none" stroke="currentColor" />
      {checked ? <path d="M6.2 8.2 7.4 9.5 10.2 6.4" stroke="currentColor" strokeWidth="1.3" fill="none" /> : null}
    </svg>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <path d="M3 3.5h6M3 8h4.5M3 12.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12 3.5v9M10 5.2 12 3.2 14 5.2M10 10.8 12 12.8 14 10.8" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function FileTile({
  file,
  selected,
  layout,
  onClick,
}: {
  file: File;
  selected: boolean;
  layout: "grid" | "list";
  onClick: () => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const image = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  return (
    <button
      type="button"
      onClick={onClick}
      title="Cloud Picker"
      className={cn(
        "overflow-hidden rounded-lg border bg-white text-left",
        layout === "list" ? "flex h-12 items-center gap-2 px-2" : "flex flex-col",
        selected ? "border-[#1a73e8] bg-[#e8f0fe] ring-1 ring-[#1a73e8]" : "border-slate-200 hover:border-slate-300",
      )}
    >
      <span
        className={cn("relative block", layout === "list" ? "h-8 w-8 shrink-0" : "h-20 w-full")}
        style={{
          backgroundImage:
            "linear-gradient(45deg,#eceff3 25%,transparent 25%),linear-gradient(-45deg,#eceff3 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eceff3 75%),linear-gradient(-45deg,transparent 75%,#eceff3 75%)",
          backgroundSize: "14px 14px",
          backgroundPosition: "0 0,0 7px,7px -7px,-7px 0",
          backgroundColor: "#f8fafc",
        }}
      >
        {image && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : null}
        <span className="absolute bottom-1 left-1 rounded bg-[#e11d48] px-1 py-0.5 text-[9px] font-bold text-white">
          {ext === "pdf" ? "PDF" : ext.slice(0, 4).toUpperCase() || "FILE"}
        </span>
      </span>
      <span className="truncate px-2 py-1.5 text-[12px] text-slate-800">{file.name}</span>
    </button>
  );
}

function SelectedFiles({
  label,
  source,
  files,
  chosen,
  query,
  busy,
  onQuery,
  onToggle,
  onSelectMore,
}: {
  label: string;
  source: SourceId;
  files: CloudFile[];
  chosen: Set<string>;
  query: string;
  busy: boolean;
  onQuery: (value: string) => void;
  onToggle: (key: string) => void;
  onSelectMore: () => void;
}) {
  const shown = files.filter((file) =>
    file.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="flex h-full min-h-0 w-full flex-col px-5 py-4">
      <div className="flex items-center gap-3">
        <label className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
              <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M13.2 13.2 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search for files or folders"
            className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-[14px] text-slate-800 outline-none focus:border-[#1a56db]"
          />
        </label>
        <button
          type="button"
          onClick={onSelectMore}
          disabled={busy}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-[#1a56db] px-3 text-[13px] font-medium text-[#1a56db] hover:bg-blue-50 disabled:opacity-60"
        >
          <SourceIcon id={source} />
          {busy ? "Opening…" : "Select more files"}
        </button>
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="w-40 py-2 pr-3 font-medium">Modified time</th>
              <th className="w-28 py-2 font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((file) => (
              <tr
                key={file.key}
                title="Cloud Picker"
                onClick={() => onToggle(file.key)}
                className={cn(
                  "cursor-pointer border-b border-slate-100",
                  chosen.has(file.key) ? "bg-[#e8f1fc]" : "hover:bg-slate-50",
                )}
              >
                <td className="py-3 pr-3">
                  <span className="flex items-center gap-2 text-slate-800">
                    <FileGlyph name={file.name} />
                    <span className="truncate">{file.name}</span>
                  </span>
                </td>
                <td className="py-3 pr-3 text-slate-600">{formatWhen(file.modified)}</td>
                <td className="py-3 text-slate-600">{formatSize(file.size)}</td>
              </tr>
            ))}
            {shown.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-400">
                  No matching files
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="sr-only">{label}</p>
    </div>
  );
}

function FileGlyph({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const pdf = ext === "pdf";
  return (
    <svg viewBox="0 0 16 18" className="h-4 w-3.5 shrink-0" aria-hidden>
      <path d="M1 1.5h9L15 6.5V16.5H1z" fill={pdf ? "#e11d48" : "#64748b"} />
      <path d="M10 1.5V6.5h5" fill={pdf ? "#fb7185" : "#94a3b8"} />
    </svg>
  );
}

export function CloudPickerDialog({
  open,
  onClose,
  onAttach,
}: {
  open: boolean;
  onClose: () => void;
  onAttach: (files: File[]) => void;
}) {
  const [source, setSource] = useState<SourceId>("workdrive");
  const [filesBySource, setFilesBySource] = useState<Partial<Record<SourceId, CloudFile[]>>>({});
  const [ready, setReady] = useState<Partial<Record<SourceId, boolean>>>({});
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [chosenBySource, setChosenBySource] = useState<Partial<Record<SourceId, string[]>>>({});

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setSource("workdrive");
    setFilesBySource({});
    setReady({});
    setQuery("");
    setError("");
    setPicking(false);
    setBrowsing(false);
    setChosenBySource({});
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const item = SOURCES.find((row) => row.id === source) ?? SOURCES[0];
  const files = filesBySource[source] ?? [];
  const chosen = new Set(chosenBySource[source] ?? []);
  const view = browsing ? "browse" : files.length > 0 ? "files" : ready[source] ? "access" : "connect";
  const count = files.filter((file) => chosen.has(file.key)).length;
  const quietError = error.startsWith("OneDrive is open") || error.includes("not connected");

  function choose(id: SourceId) {
    setSource(id);
    setQuery("");
    setError("");
    setBrowsing(false);
  }

  function toggleChosen(key: string) {
    setChosenBySource((prev) => {
      const current = prev[source] ?? [];
      const next = current.includes(key)
        ? current.filter((id) => id !== key)
        : [...current, key];
      return { ...prev, [source]: next };
    });
  }

  function confirmBrowse(picked: File[]) {
    if (picked.length) {
      const added = picked.map(toCloudFile);
      setFilesBySource((prev) => ({
        ...prev,
        [source]: [...(prev[source] ?? []), ...added],
      }));
      setChosenBySource((prev) => ({
        ...prev,
        [source]: [...(prev[source] ?? []), ...added.map((file) => file.key)],
      }));
    }
    setBrowsing(false);
  }

  function markReady(id: SourceId) {
    setReady((prev) => ({ ...prev, [id]: true }));
  }

  function authenticate() {
    setError("");
    markReady(source);
    setBrowsing(true);
  }

  function attach() {
    const selected = files.filter((file) => chosen.has(file.key));
    if (!selected.length) return;
    onAttach(selected.map((file) => file.file));
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/35 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add documents from the cloud"
        className="relative flex h-[min(560px,calc(100vh-2rem))] w-[min(980px,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-3 z-10 text-xl leading-none text-slate-700 hover:text-slate-950"
        >
          ×
        </button>
        <div className="flex min-h-0 flex-1">
          <aside className="w-[212px] shrink-0 border-r border-slate-200 py-3">
            {SOURCES.map((row) => {
              const active = source === row.id;
              const badge = (filesBySource[row.id] ?? []).filter((file) =>
                (chosenBySource[row.id] ?? []).includes(file.key),
              ).length;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => choose(row.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-l-[3px] px-4 py-2.5 text-left text-[15px] text-slate-700",
                    active
                      ? "border-[#2f7de1] bg-[#f4f8fd] font-medium text-slate-800"
                      : "border-transparent hover:bg-slate-50",
                  )}
                >
                  <span className="relative">
                    <SourceIcon id={row.id} />
                    {badge > 0 ? (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1a56db] px-1 text-[10px] font-semibold leading-none text-white">
                        {badge}
                      </span>
                    ) : null}
                  </span>
                  {row.label}
                </button>
              );
            })}
          </aside>
          <div
            className={cn(
              "relative flex min-w-0 flex-1 overflow-y-auto",
              view === "files" || view === "browse" ? "items-stretch" : "items-center justify-center px-8 py-6",
            )}
          >
            {view === "connect" ? (
              <ConnectAccount
                label={item.label}
                terms={item.terms}
                privacy={item.privacy}
                busy={picking}
                onAuthenticate={authenticate}
              />
            ) : null}
            {view === "access" ? (
              <FilesAccess label={item.label} busy={picking} onSelect={() => setBrowsing(true)} />
            ) : null}
            {view === "browse" ? (
              <DriveBrowser
                source={source}
                label={item.label}
                onCancel={() => setBrowsing(false)}
                onConfirm={confirmBrowse}
              />
            ) : null}
            {view === "files" ? (
              <SelectedFiles
                label={item.label}
                source={source}
                files={files}
                chosen={chosen}
                query={query}
                busy={picking}
                onQuery={setQuery}
                onToggle={toggleChosen}
                onSelectMore={() => setBrowsing(true)}
              />
            ) : null}
          </div>
        </div>
        {view === "browse" ? (
          <p className="border-t border-slate-100 py-2 text-center text-[13px] text-slate-600">
            Want to close {item.label} file picker?{" "}
            <button
              type="button"
              className="text-[#1a56db] hover:underline"
              onClick={() => setBrowsing(false)}
            >
              Click here to exit
            </button>
          </p>
        ) : null}
        {error ? (
          <p
            className={cn(
              "border-t border-slate-100 px-5 py-2 text-[12px]",
              quietError ? "text-slate-500" : "text-rose-600",
            )}
          >
            {error}
          </p>
        ) : null}
        {view === "browse" ? null : (
        <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <span className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-300 px-4 text-[13px] text-slate-600">
            {count === 0
              ? "No files selected"
              : `${count} file${count === 1 ? "" : "s"} selected`}
            {count > 0 ? <span aria-hidden>›</span> : null}
          </span>
          <button
            type="button"
            disabled={count === 0}
            onClick={attach}
            className={cn(
              "inline-flex h-9 items-center rounded-full px-5 text-[14px] font-medium",
              count === 0
                ? "cursor-default bg-[#d7ebf8] text-[#7eb3dc]"
                : "bg-[#1a56db] text-white hover:bg-[#1648b8]",
            )}
          >
            Attach →
          </button>
        </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SourceIcon({ id }: { id: SourceId }) {
  if (id === "workdrive") {
    return (
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" aria-hidden>
        <rect width="20" height="20" rx="3" fill="#1a73e8" />
        <path d="M5 13.5V6.5h4.2l1.2 1.4H15v5.6H5z" fill="white" />
        <path d="M6.2 12.2h7.6M6.2 10.4h4.2" stroke="#1a73e8" strokeWidth="1" />
      </svg>
    );
  }
  if (id === "dropbox") {
    return (
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" aria-hidden>
        <path fill="#0061ff" d="M6 4.2 10 6.7 6 9.2 2 6.7zM14 4.2 18 6.7 14 9.2 10 6.7zM6 10.8 10 13.3 6 15.8 2 13.3zM14 10.8 18 13.3 14 15.8 10 13.3z" />
      </svg>
    );
  }
  if (id === "box") {
    return (
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" aria-hidden>
        <rect width="20" height="20" rx="3" fill="#0061d5" />
        <text x="10" y="13.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="white" fontFamily="Arial, sans-serif">
          box
        </text>
      </svg>
    );
  }
  if (id === "gdrive") {
    return (
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" aria-hidden>
        <path fill="#4285f4" d="M7.2 3.2h5.6L17.4 11 12.8 16.8H7.2L2.6 11z" />
        <path fill="#34a853" d="M2.6 11 7.2 16.8h5.6L7.4 11z" />
        <path fill="#fbbc04" d="M7.2 3.2 2.6 11h4.8l4.6-7.8z" />
        <path fill="#ea4335" d="M12.8 3.2 17.4 11h-4.6L8.2 3.2z" />
      </svg>
    );
  }
  if (id === "onedrive") {
    return (
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" aria-hidden>
        <path fill="#28a8ea" d="M7.2 13.6 3.2 11.4A3.2 3.2 0 0 1 4.6 5.6 4.2 4.2 0 0 1 12 6.2a3.4 3.4 0 0 1 4.6 3.2 2.8 2.8 0 0 1-1.2 4.2z" />
        <path fill="#0364b8" d="M7.2 13.6 12 8.8l3.4 4.8H7.2z" opacity="0.9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" aria-hidden>
      <circle cx="10" cy="10" r="8" fill="#038387" />
      <text x="10" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="Arial, sans-serif">
        S
      </text>
    </svg>
  );
}
