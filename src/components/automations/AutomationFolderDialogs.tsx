"use client";

import { useState } from "react";
import { Folder, FolderInput, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { folderOptions } from "@/lib/automations/folders";
import type { AutomationFolder } from "@/lib/automations/types";
import { cn } from "@/lib/utils";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Creates a folder, or renames one when `folder` is given. */
export function FolderNameDialog({
  open,
  folder,
  parentName,
  onClose,
  onSubmit,
}: {
  open: boolean;
  folder?: AutomationFolder | null;
  /** Where a new folder will be created, for the description. */
  parentName?: string | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<unknown>;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed so every opening starts from the folder's current name. */}
        {open && (
          <FolderNameForm
            key={folder?.id ?? "new"}
            folder={folder}
            parentName={parentName}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FolderNameForm({
  folder,
  parentName,
  onClose,
  onSubmit,
}: {
  folder?: AutomationFolder | null;
  parentName?: string | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<unknown>;
}) {
  const [name, setName] = useState(folder?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const unchanged = Boolean(folder) && trimmed === folder?.name;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed || unchanged) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(errorMessage(err, folder ? "Could not rename the folder" : "Could not create the folder"));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <DialogTitle>{folder ? "Rename folder" : "Create folder"}</DialogTitle>
        <DialogDescription>
          {folder
            ? "Workflows inside keep running; only the folder name changes."
            : parentName
              ? `The folder will be created inside “${parentName}”.`
              : "Group related workflows so the list stays easy to scan."}
        </DialogDescription>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="automation-folder-name">Folder name</Label>
        <Input
          id="automation-folder-name"
          value={name}
          maxLength={120}
          autoFocus
          placeholder="e.g. Lead nurturing"
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!trimmed || unchanged || saving} className="gap-1.5">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {folder ? "Rename" : "Create folder"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export type MoveTarget =
  | { kind: "automation"; id: string; name: string; parentId: string | null }
  | { kind: "folder"; id: string; name: string; parentId: string | null };

/**
 * Picks a destination folder for a workflow or a folder. A folder is never
 * offered its own subtree, and "Move here" stays off until the choice differs
 * from where it already is.
 */
export function MoveToFolderDialog({
  target,
  folders,
  onClose,
  onSubmit,
}: {
  target: MoveTarget | null;
  folders: AutomationFolder[];
  onClose: () => void;
  onSubmit: (destinationId: string | null) => Promise<unknown>;
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target && (
          <MoveForm
            key={`${target.kind}:${target.id}`}
            target={target}
            folders={folders}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MoveForm({
  target,
  folders,
  onClose,
  onSubmit,
}: {
  target: MoveTarget;
  folders: AutomationFolder[];
  onClose: () => void;
  onSubmit: (destinationId: string | null) => Promise<unknown>;
}) {
  const [destination, setDestination] = useState<string | null>(target.parentId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = folderOptions(folders, target.kind === "folder" ? target.id : undefined);
  const unchanged = destination === target.parentId;

  async function submit() {
    if (unchanged) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(destination);
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not move it"));
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid gap-2">
        <DialogTitle>Move “{target.name}”</DialogTitle>
        <DialogDescription>
          {target.kind === "automation"
            ? "Moving a workflow doesn't change its status. A published workflow stays published."
            : "Everything inside the folder moves with it."}
        </DialogDescription>
      </div>

      <div
        role="radiogroup"
        aria-label="Destination folder"
        className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 py-1"
      >
        <DestinationOption
          label="Workflows (top level)"
          depth={0}
          icon={<FolderInput className="h-4 w-4 text-slate-400" />}
          selected={destination === null}
          current={target.parentId === null}
          onSelect={() => setDestination(null)}
        />
        {options.map(({ folder, depth }) => (
          <DestinationOption
            key={folder.id}
            label={folder.name}
            depth={depth + 1}
            icon={<Folder className="h-4 w-4 text-amber-500" />}
            selected={destination === folder.id}
            current={target.parentId === folder.id}
            onSelect={() => setDestination(folder.id)}
          />
        ))}
        {options.length === 0 && (
          <p className="px-3 py-3 text-xs text-slate-400">
            No other folders yet. Create one from the workflows list first.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void submit()} disabled={unchanged || saving} className="gap-1.5">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Move here
        </Button>
      </DialogFooter>
    </>
  );
}

function DestinationOption({
  label,
  depth,
  icon,
  selected,
  current,
  onSelect,
}: {
  label: string;
  depth: number;
  icon: React.ReactNode;
  selected: boolean;
  current: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      style={{ paddingLeft: `${12 + depth * 18}px` }}
      className={cn(
        "flex w-full items-center gap-2 py-2 pr-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400",
        selected ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {current && <span className="text-[11px] font-medium text-slate-400">Current</span>}
    </button>
  );
}
