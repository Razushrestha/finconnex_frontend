"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { ChevronDown, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

function StageDropGap() {
  return (
    <div
      className="mx-1 my-1 h-9 rounded-md border-2 border-dashed border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/40"
      aria-hidden
    />
  );
}

export interface KanbanStageColumnOption {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
  color?: string;
}

export function KanbanStagesMenu({
  columns,
  onToggle,
  onRename,
  onAdd,
  onReorder,
  recordCountById,
  onTransferAndRemove,
  stageColors,
  colorPalette,
  onStageColor,
  onEditStage,
}: {
  columns: KanbanStageColumnOption[];
  onToggle?: (columnId: string) => void;
  onRename?: (columnId: string, nextLabel: string) => void;
  onAdd?: (title: string, color?: string) => void;
  onReorder?: (
    draggedId: string,
    targetId: string,
    place?: "before" | "after",
  ) => void;
  /** How many records sit on each title. Used before delete. */
  recordCountById?: Record<string, number>;
  onTransferAndRemove?: (fromId: string, toId: string) => void | Promise<void>;
  /** Current header color keyed by stage id. */
  stageColors?: Record<string, string>;
  colorPalette?: readonly string[];
  onStageColor?: (columnId: string, color: string) => void;
  /** Save title and color together so one update does not overwrite the other. */
  onEditStage?: (
    columnId: string,
    next: { label: string; color?: string },
  ) => void;
}) {
  const [isStagesOpen, setIsStagesOpen] = useState(false);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dropSlot, setDropSlot] = useState<{
    id: string;
    place: "before" | "after";
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
    count: number;
  } | null>(null);
  const [transferToId, setTransferToId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [editing, setEditing] = useState<{
    mode: "edit" | "create";
    id: string;
    label: string;
    color: string;
  } | null>(null);

  const activeTitles = columns.filter((col) => col.visible);
  const transferTargets = pendingDelete
    ? activeTitles.filter((col) => col.id !== pendingDelete.id)
    : [];

  function openEditor(col: KanbanStageColumnOption) {
    setEditing({
      mode: "edit",
      id: col.id,
      label: col.label,
      color: col.color ?? stageColors?.[col.id] ?? colorPalette?.[0] ?? "",
    });
  }

  function openCreate() {
    setIsAddStageOpen(false);
    setEditing({
      mode: "create",
      id: "",
      label: "",
      color: colorPalette?.[0] ?? "",
    });
  }

  function saveEditor(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const label = editing.label.trim();
    if (!label) return;
    if (editing.mode === "create") {
      onAdd?.(label, editing.color || undefined);
      setEditing(null);
      return;
    }
    if (onEditStage) {
      onEditStage(editing.id, {
        label,
        color: editing.color || undefined,
      });
      setEditing(null);
      return;
    }
    const current = columns.find((col) => col.id === editing.id);
    if (label !== current?.label) onRename?.(editing.id, label);
    if (
      editing.color &&
      onStageColor &&
      editing.color !== stageColors?.[editing.id]
    ) {
      onStageColor(editing.id, editing.color);
    }
    setEditing(null);
  }

  function requestRemove(col: KanbanStageColumnOption) {
    if (col.required) return;
    const count = recordCountById?.[col.id] ?? 0;
    const others = activeTitles.filter((item) => item.id !== col.id);
    if (count > 0 && others.length > 0 && onTransferAndRemove) {
      setPendingDelete({ id: col.id, label: col.label, count });
      setTransferToId(others[0]?.id ?? "");
      return;
    }
    if (count > 0 && !others.length) {
      window.alert(
        `“${col.label}” still has ${count} record${count === 1 ? "" : "s"}. Show another stage first, then delete this title.`,
      );
      return;
    }
    onToggle?.(col.id);
  }

  async function confirmTransfer() {
    if (!pendingDelete || !transferToId || !onTransferAndRemove) return;
    setTransferring(true);
    try {
      await onTransferAndRemove(pendingDelete.id, transferToId);
      setPendingDelete(null);
      setTransferToId("");
    } finally {
      setTransferring(false);
    }
  }

  function clearDrag() {
    setDraggedColumnId(null);
    setDropSlot(null);
  }

  function setSlotFromEvent(
    colId: string,
    e: DragEvent<HTMLElement>,
  ) {
    if (!draggedColumnId || draggedColumnId === colId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const place: "before" | "after" =
      e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropSlot((prev) =>
      prev?.id === colId && prev.place === place ? prev : { id: colId, place },
    );
  }

  if (!columns.length) return null;

  return (
    <>
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsStagesOpen((open) => {
            const next = !open;
            if (!next) setIsAddStageOpen(false);
            return next;
          });
        }}
        aria-expanded={isStagesOpen}
        aria-haspopup="true"
        className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-[14px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-800"
      >
        <span>Stages</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
            isStagesOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isStagesOpen ? (
        <div className="mt-0.5 rounded-md border border-slate-100 bg-slate-50/80 p-1 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="max-h-64 overflow-y-auto">
            {columns.map((col) => (
              <div
                key={col.id}
                onDragOver={(e) => {
                  if (!col.visible) return;
                  setSlotFromEvent(col.id, e);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const place =
                    dropSlot?.id === col.id ? dropSlot.place : "before";
                  if (draggedColumnId && draggedColumnId !== col.id) {
                    onReorder?.(draggedColumnId, col.id, place);
                  }
                  clearDrag();
                }}
              >
                {draggedColumnId &&
                dropSlot?.id === col.id &&
                dropSlot.place === "before" &&
                draggedColumnId !== col.id ? (
                  <StageDropGap />
                ) : null}
                <div
                  draggable={!!onReorder && col.visible}
                  onDragStart={(e) => {
                    setDraggedColumnId(col.id);
                    setDropSlot(null);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", col.id);
                  }}
                  onDragOver={(e) => {
                    if (!col.visible) return;
                    setSlotFromEvent(col.id, e);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const place =
                      dropSlot?.id === col.id ? dropSlot.place : "before";
                    if (draggedColumnId && draggedColumnId !== col.id) {
                      onReorder?.(draggedColumnId, col.id, place);
                    }
                    clearDrag();
                  }}
                  onDragEnd={clearDrag}
                  className={`flex items-start gap-1 rounded ${
                    draggedColumnId === col.id
                      ? "opacity-40"
                      : draggedColumnId
                        ? "transition-[margin] duration-150"
                        : ""
                  }`}
                >
                  {onReorder ? (
                    <GripVertical className="mt-2 h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 active:cursor-grabbing" />
                  ) : null}
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-[13px] text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-zinc-800">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      disabled={col.required}
                      onChange={() => onToggle?.(col.id)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-400 disabled:opacity-50 dark:border-zinc-600"
                    />
                    {col.color || stageColors?.[col.id] ? (
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{
                          backgroundColor: col.color || stageColors?.[col.id],
                        }}
                        aria-hidden
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">
                      {col.label}
                    </span>
                  </label>
                  {onRename ? (
                    <button
                      type="button"
                      title={`Rename ${col.label}`}
                      aria-label={`Rename ${col.label}`}
                      onClick={() => openEditor(col)}
                      className="mt-1 shrink-0 rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-slate-200"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  ) : null}
                  {onToggle && !col.required ? (
                    <button
                      type="button"
                      title={`Remove ${col.label} from the board`}
                      aria-label={`Remove ${col.label} from the board`}
                      onClick={() => requestRemove(col)}
                      className="mt-1 shrink-0 rounded p-1 text-slate-400 hover:bg-white hover:text-rose-600 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
                {draggedColumnId &&
                dropSlot?.id === col.id &&
                dropSlot.place === "after" &&
                draggedColumnId !== col.id ? (
                  <StageDropGap />
                ) : null}
              </div>
              ))}
            {columns.every((col) => !col.visible) ? (
              <p className="px-2 py-2 text-[12px] text-slate-400">
                No stages on the board
              </p>
            ) : null}
          </div>

          <div className="relative mt-1 border-t border-slate-200 pt-1 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsAddStageOpen((open) => !open)}
              aria-expanded={isAddStageOpen}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[13px] font-medium text-violet-700 hover:bg-white dark:text-violet-300 dark:hover:bg-zinc-800"
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add stage
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  isAddStageOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isAddStageOpen ? (
              <div className="mt-0.5 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
                {onAdd ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="flex w-full items-center rounded px-2 py-1.5 text-left text-[13px] font-medium text-violet-700 hover:bg-slate-50 dark:text-violet-300 dark:hover:bg-zinc-800"
                  >
                    Custom title…
                  </button>
                ) : null}
                {columns
                  .filter((col) => !col.visible)
                  .map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        onToggle?.(col.id);
                        setIsAddStageOpen(false);
                      }}
                      className="flex w-full items-center rounded px-2 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-800"
                    >
                      {col.label}
                    </button>
                  ))}
                {columns.every((col) => col.visible) ? (
                  <p className="px-2 py-2 text-[12px] text-slate-400">
                    All stages are already on the board. Hide one to reuse it
                    as a custom title.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
    {editing ? (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setEditing(null);
        }}
      >
        <form
          className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900"
          onSubmit={saveEditor}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-zinc-100">
            {editing.mode === "create" ? "Add stage" : "Edit stage"}
          </h3>
          <label className="mt-4 block text-[13px] font-medium text-slate-600 dark:text-zinc-300">
            Title
            <input
              autoFocus
              value={editing.label}
              onChange={(e) =>
                setEditing((prev) =>
                  prev ? { ...prev, label: e.target.value } : prev,
                )
              }
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          {colorPalette?.length ? (
            <fieldset className="mt-4">
              <legend className="text-[13px] font-medium text-slate-600 dark:text-zinc-300">
                Title color
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {colorPalette.map((hex) => {
                  const selected = editing.color.toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Use ${hex}`}
                      aria-pressed={selected}
                      onClick={() =>
                        setEditing((prev) =>
                          prev ? { ...prev, color: hex } : prev,
                        )
                      }
                      className={`h-7 w-7 rounded-full border-2 ${
                        selected
                          ? "border-slate-900 ring-2 ring-violet-300 dark:border-white"
                          : "border-white shadow-sm dark:border-zinc-700"
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!editing.label.trim()}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {editing.mode === "create" ? "Add" : "Save"}
            </button>
          </div>
        </form>
      </div>
    ) : null}
    {pendingDelete ? (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !transferring) {
            setPendingDelete(null);
          }
        }}
      >
        <div
          className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-zinc-100">
            Transfer data before delete
          </h3>
          <p className="mt-2 text-[13px] leading-5 text-slate-600 dark:text-zinc-300">
            “{pendingDelete.label}” has {pendingDelete.count} record
            {pendingDelete.count === 1 ? "" : "s"} (leads, documents, or
            other data). Choose an active title to move them to, then this
            title will be deleted.
          </p>
          <p className="mt-3 text-[12px] font-medium text-slate-500">
            Actively used titles
          </p>
          <ul className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700">
            {transferTargets.map((col) => (
              <li key={col.id}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[13px] text-slate-800 hover:bg-slate-50 dark:text-zinc-100 dark:hover:bg-zinc-800">
                  <input
                    type="radio"
                    name="transfer-stage"
                    checked={transferToId === col.id}
                    onChange={() => setTransferToId(col.id)}
                    className="accent-violet-600"
                  />
                  <span className="min-w-0 truncate">{col.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              disabled={transferring}
              onClick={() => setPendingDelete(null)}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!transferToId || transferring}
              onClick={() => void confirmTransfer()}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {transferring ? "Transferring…" : "Transfer and delete"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
