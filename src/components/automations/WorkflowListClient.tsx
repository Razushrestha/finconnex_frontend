"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Copy,
  Folder,
  FolderInput,
  FolderPlus,
  Loader2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  Power,
  PowerOff,
  Trash2,
  Workflow,
} from "lucide-react";

import {
  FolderNameDialog,
  MoveToFolderDialog,
  type MoveTarget,
} from "@/components/automations/AutomationFolderDialogs";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SearchInput } from "@/components/ui/search-input";
import {
  createAutomationFolder,
  deleteAutomation,
  deleteAutomationFolder,
  disableAutomation,
  duplicateAutomation,
  listAutomationFolders,
  listAutomations,
  moveAutomation,
  pauseAutomation,
  resumeAutomation,
  updateAutomationFolder,
} from "@/lib/automations/api";
import { childFolders, folderItemCount, folderPath } from "@/lib/automations/folders";
import {
  automationStatusColor,
  TRIGGER_CATALOG,
  type Automation,
  type AutomationFolder,
  type AutomationTriggerType,
} from "@/lib/automations/types";
import { cn } from "@/lib/utils";

function fmt(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function folderHref(folderId: string | null): string {
  return folderId ? `/automations?folder=${encodeURIComponent(folderId)}` : "/automations";
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * The workflows list, one folder level at a time. `folderId` comes from the
 * URL, so the back button and a shared link both land in the same folder;
 * null is the top level. A search looks across every folder at once.
 */
export function WorkflowListClient({ folderId }: { folderId: string | null }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  /** Bumped after every write so the effect below refetches. */
  const [reloads, setReloads] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ folder: AutomationFolder | null } | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<AutomationFolder | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const query = search.trim();
  const searching = query.length > 0;

  /**
   * Loading is derived rather than stored: the data on screen belongs to one
   * request, and until the response for the current folder, search and reload
   * arrives, the list shows its spinner. Earlier folders stay loaded so the
   * breadcrumb doesn't blink while the next level loads.
   */
  const requestKey = `${folderId ?? ""}|${query}|${reloads}`;
  const [loaded, setLoaded] = useState<{
    key: string | null;
    folders: AutomationFolder[];
    items: Automation[];
    error: string | null;
  }>({ key: null, folders: [], items: [], error: null });
  const { folders, items, error } = loaded;
  const loading = loaded.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listAutomationFolders(),
      listAutomations({
        limit: 100,
        search: query || undefined,
        folderId: query ? undefined : (folderId ?? "root"),
      }),
    ])
      .then(([nextFolders, { items: nextItems }]) => {
        if (cancelled) return;
        setLoaded({ key: requestKey, folders: nextFolders, items: nextItems, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoaded((previous) => ({
          ...previous,
          key: requestKey,
          items: [],
          error: err instanceof Error ? err.message : "Failed to load workflows",
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, folderId, query]);

  const refresh = useCallback(() => setReloads((count) => count + 1), []);

  // Any click outside an open row menu closes it; clicks inside the menu cell
  // stop propagating, so its own items still work.
  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openMenu]);

  const path = useMemo(() => folderPath(folders, folderId), [folders, folderId]);
  const currentFolder = path[path.length - 1] ?? null;
  const folderMissing = Boolean(folderId) && !loading && !error && !currentFolder;

  const visibleFolders = useMemo(() => {
    if (!searching) return childFolders(folders, folderId);
    const needle = query.toLowerCase();
    return folders
      .filter((folder) => folder.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [folders, folderId, query, searching]);

  /** "Sales / Nurture" — where a search result lives, since results span folders. */
  const locationOf = useCallback(
    (parentId: string | null) =>
      folderPath(folders, parentId)
        .map((folder) => folder.name)
        .join(" / ") || "Top level",
    [folders]
  );

  async function withBusy(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setOpenMenu(null);
    try {
      await action();
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function confirmDeleteFolder() {
    if (!deletingFolder) return;
    setDeleteBusy(true);
    try {
      await deleteAutomationFolder(deletingFolder.id);
      setDeletingFolder(null);
      refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete the folder");
    } finally {
      setDeleteBusy(false);
    }
  }

  const empty = !loading && visibleFolders.length === 0 && items.length === 0;
  const columns = 6;

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading truncate text-2xl font-semibold text-slate-900">
            {currentFolder?.name ?? "Workflows"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {currentFolder
              ? "Workflows and folders filed in this folder."
              : "Create and manage workflows to automate business processes, improve efficiency, and increase conversions."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setFolderDialog({ folder: null })}
            disabled={folderMissing}
            className="gap-1.5"
          >
            <FolderPlus className="h-4 w-4" />
            Create Folder
          </Button>
          <Button
            onClick={() =>
              router.push(
                folderId ? `/automations/new?folder=${encodeURIComponent(folderId)}` : "/automations/new"
              )
            }
            disabled={folderMissing}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Workflow
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          {searching ? (
            <span className="text-slate-500">Search results across all folders</span>
          ) : (
            <>
              <Link
                href={folderHref(null)}
                className={cn(
                  "rounded px-1 py-0.5 hover:bg-slate-100",
                  currentFolder ? "text-slate-500 hover:text-slate-800" : "font-medium text-slate-800"
                )}
              >
                All workflows
              </Link>
              {path.map((folder, index) => (
                <Fragment key={folder.id}>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  {index === path.length - 1 ? (
                    <span aria-current="page" className="truncate px-1 font-medium text-slate-800">
                      {folder.name}
                    </span>
                  ) : (
                    <Link
                      href={folderHref(folder.id)}
                      className="truncate rounded px-1 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      {folder.name}
                    </Link>
                  )}
                </Fragment>
              ))}
            </>
          )}
        </nav>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search workflows and folders"
          className="w-full sm:w-72"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {folderMissing ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-500">
          <Folder className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          This folder no longer exists. It may have been deleted or moved.
          <div className="mt-3">
            <Link href={folderHref(null)} className="font-medium text-indigo-600 hover:underline">
              Back to all workflows
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Created</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={columns} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
              {empty && (
                <tr>
                  <td colSpan={columns} className="px-4 py-14 text-center text-slate-400">
                    {searching ? (
                      <>No workflows or folders match “{query}”.</>
                    ) : currentFolder ? (
                      <>
                        <Folder className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        This folder is empty. Create a workflow or a subfolder here, or move existing workflows in.
                      </>
                    ) : (
                      <>
                        <Workflow className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        No workflows yet. Create your first one, or start with a folder to keep them organised.
                      </>
                    )}
                  </td>
                </tr>
              )}

              {!loading &&
                visibleFolders.map((folder) => {
                  const contents = folderItemCount(folders, folder);
                  const subfolders = folders.filter((f) => f.parentId === folder.id).length;
                  return (
                    <tr
                      key={`folder:${folder.id}`}
                      className="cursor-pointer border-b border-slate-50 hover:bg-slate-50/60"
                      onClick={() => {
                        setSearch("");
                        router.push(folderHref(folder.id));
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Folder className="h-4 w-4 shrink-0 fill-amber-100 text-amber-500" />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-800">{folder.name}</div>
                            {searching && (
                              <div className="truncate text-xs text-slate-400">{locationOf(folder.parentId)}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500" colSpan={2}>
                        {contents === 0
                          ? "Empty folder"
                          : [
                              folder.automationCount > 0 ? plural(folder.automationCount, "workflow") : null,
                              subfolders > 0 ? plural(subfolders, "folder") : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{fmt(folder.updatedAt)}</td>
                      <td className="px-4 py-3 text-slate-500">{fmt(folder.createdAt)}</td>
                      <RowMenu
                        id={`folder:${folder.id}`}
                        label={`Actions for folder ${folder.name}`}
                        openMenu={openMenu}
                        setOpenMenu={setOpenMenu}
                        busy={busy === `folder:${folder.id}`}
                      >
                        <MenuItem
                          icon={<Pencil className="h-3.5 w-3.5" />}
                          label="Rename"
                          onClick={() => {
                            setOpenMenu(null);
                            setFolderDialog({ folder });
                          }}
                        />
                        <MenuItem
                          icon={<FolderInput className="h-3.5 w-3.5" />}
                          label="Move to folder"
                          onClick={() => {
                            setOpenMenu(null);
                            setMoveTarget({
                              kind: "folder",
                              id: folder.id,
                              name: folder.name,
                              parentId: folder.parentId,
                            });
                          }}
                        />
                        <MenuItem
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          label="Delete"
                          hint={contents > 0 ? "Empty it first" : undefined}
                          disabled={contents > 0}
                          danger
                          onClick={() => {
                            setOpenMenu(null);
                            setDeletingFolder(folder);
                          }}
                        />
                      </RowMenu>
                    </tr>
                  );
                })}

              {!loading &&
                items.map((automation) => {
                  const trigger = automation.activeVersion?.triggerType ?? automation.versions?.[0]?.triggerType;
                  const triggerMeta = trigger ? TRIGGER_CATALOG[trigger as AutomationTriggerType] : undefined;
                  return (
                    <tr
                      key={automation.id}
                      className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                      onClick={() => router.push(`/automations/${automation.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Workflow className="h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-800">{automation.name}</div>
                            {searching && (
                              <div className="truncate text-xs text-slate-400">
                                {locationOf(automation.folderId ?? null)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{triggerMeta?.label ?? trigger ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                            automationStatusColor(automation.status)
                          )}
                        >
                          {automation.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{fmt(automation.updatedAt)}</td>
                      <td className="px-4 py-3 text-slate-500">{fmt(automation.createdAt)}</td>
                      <RowMenu
                        id={automation.id}
                        label={`Actions for workflow ${automation.name}`}
                        openMenu={openMenu}
                        setOpenMenu={setOpenMenu}
                        busy={busy === automation.id}
                      >
                        {automation.status === "ENABLED" ? (
                          <MenuItem
                            icon={<PowerOff className="h-3.5 w-3.5" />}
                            label="Disable"
                            onClick={() => withBusy(automation.id, () => disableAutomation(automation.id))}
                          />
                        ) : (
                          <MenuItem
                            icon={<Power className="h-3.5 w-3.5" />}
                            label="Enable"
                            onClick={() => router.push(`/automations/${automation.id}`)}
                          />
                        )}
                        {automation.status === "PAUSED" ? (
                          <MenuItem
                            icon={<Play className="h-3.5 w-3.5" />}
                            label="Resume"
                            onClick={() => withBusy(automation.id, () => resumeAutomation(automation.id))}
                          />
                        ) : automation.status === "ENABLED" ? (
                          <MenuItem
                            icon={<Pause className="h-3.5 w-3.5" />}
                            label="Pause"
                            onClick={() => withBusy(automation.id, () => pauseAutomation(automation.id))}
                          />
                        ) : null}
                        <MenuItem
                          icon={<FolderInput className="h-3.5 w-3.5" />}
                          label="Move to folder"
                          onClick={() => {
                            setOpenMenu(null);
                            setMoveTarget({
                              kind: "automation",
                              id: automation.id,
                              name: automation.name,
                              parentId: automation.folderId ?? null,
                            });
                          }}
                        />
                        <MenuItem
                          icon={<Copy className="h-3.5 w-3.5" />}
                          label="Duplicate"
                          onClick={() => withBusy(automation.id, () => duplicateAutomation(automation.id))}
                        />
                        <MenuItem
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          label="Delete"
                          danger
                          onClick={() => {
                            if (window.confirm(`Delete "${automation.name}"?`)) {
                              void withBusy(automation.id, () => deleteAutomation(automation.id));
                            }
                          }}
                        />
                      </RowMenu>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      <FolderNameDialog
        open={Boolean(folderDialog)}
        folder={folderDialog?.folder}
        parentName={currentFolder?.name}
        onClose={() => setFolderDialog(null)}
        onSubmit={async (name) => {
          const renaming = folderDialog?.folder;
          if (renaming) await updateAutomationFolder(renaming.id, { name });
          else await createAutomationFolder({ name, parentId: folderId });
          refresh();
        }}
      />

      <MoveToFolderDialog
        target={moveTarget}
        folders={folders}
        onClose={() => setMoveTarget(null)}
        onSubmit={async (destinationId) => {
          if (!moveTarget) return;
          if (moveTarget.kind === "automation") await moveAutomation(moveTarget.id, destinationId);
          else await updateAutomationFolder(moveTarget.id, { parentId: destinationId });
          refresh();
        }}
      />

      <ConfirmModal
        isOpen={Boolean(deletingFolder)}
        onClose={() => setDeletingFolder(null)}
        onConfirm={confirmDeleteFolder}
        loading={deleteBusy}
        title="Delete folder"
        description={`Delete the empty folder “${deletingFolder?.name ?? ""}”? This can't be undone.`}
        confirmText="Delete folder"
      />
    </div>
  );
}

function RowMenu({
  id,
  label,
  openMenu,
  setOpenMenu,
  busy,
  children,
}: {
  id: string;
  label: string;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <td className="relative px-4 py-3" onClick={(e) => e.stopPropagation()}>
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : (
        <button
          type="button"
          aria-label={label}
          aria-expanded={openMenu === id}
          onClick={() => setOpenMenu(openMenu === id ? null : id)}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      )}
      {openMenu === id && (
        <div className="absolute right-4 top-10 z-10 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {children}
        </div>
      )}
    </td>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  disabled,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
        danger ? "text-rose-600" : "text-slate-700"
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </button>
  );
}
