"use client";

import { useEffect, useState } from "react";
import { FileText, FolderOpen, GripVertical, X } from "lucide-react";

import { cn } from "@/lib/utils";

const DRAG_TYPE = "application/x-finconnex-library-file";

/**
 * Moves one library file into another folder. The file is shown as a card
 * that can be dragged onto a folder; clicking a folder (or Enter on it) does
 * the same, for keyboards and touch screens where dragging isn't available.
 */
export function MoveFileDialog({
  fileName,
  sizeLabel,
  currentFolder,
  folders,
  counts,
  onMove,
  onClose,
}: {
  fileName: string;
  sizeLabel?: string;
  currentFolder: string;
  folders: string[];
  counts: Record<string, number>;
  onMove: (folder: string) => void;
  onClose: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-file-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="flex items-center justify-between pb-3">
          <h3 id="move-file-title" className="text-[14px] font-semibold text-slate-900">
            Move file
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(DRAG_TYPE, fileName);
            event.dataTransfer.effectAllowed = "move";
            setDragging(true);
          }}
          onDragEnd={() => {
            setDragging(false);
            setOver(null);
          }}
          className={cn(
            "flex cursor-grab items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2.5 active:cursor-grabbing",
            dragging && "opacity-60",
          )}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
          <FileText className="h-5 w-5 shrink-0 text-violet-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-900" title={fileName}>
              {fileName}
            </p>
            <p className="text-[11px] text-slate-500">
              In {currentFolder}
              {sizeLabel ? ` · ${sizeLabel}` : ""}
            </p>
          </div>
        </div>

        <p className="mt-4 mb-2 text-[12px] text-slate-500">
          Drag the file onto a folder, or click a folder.
        </p>
        <ul className="grid grid-cols-2 gap-2" aria-label="Folders">
          {folders.map((folder) => {
            const current = folder === currentFolder;
            const target = over === folder;
            return (
              <li key={folder}>
                <button
                  type="button"
                  disabled={current}
                  onClick={() => onMove(folder)}
                  onDragOver={(event) => {
                    if (current || !event.dataTransfer.types.includes(DRAG_TYPE)) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (over !== folder) setOver(folder);
                  }}
                  onDragLeave={() => {
                    if (over === folder) setOver(null);
                  }}
                  onDrop={(event) => {
                    if (current) return;
                    event.preventDefault();
                    setOver(null);
                    setDragging(false);
                    onMove(folder);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition",
                    current
                      ? "cursor-default border-slate-100 bg-slate-50 text-slate-400"
                      : target
                        ? "border-violet-500 bg-violet-50 text-violet-800 ring-2 ring-violet-200"
                        : dragging
                          ? "border-dashed border-violet-300 bg-white text-slate-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/40",
                  )}
                >
                  <FolderOpen
                    className={cn("h-4 w-4 shrink-0", target ? "text-violet-600" : "text-slate-400")}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{folder}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {current ? "Current" : (counts[folder] ?? 0)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
