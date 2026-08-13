"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, HelpCircle, Pencil, Search, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ShareWith = "only-me" | "everyone" | "selected-users";

export type KanbanHeaderStyle = "Multi Colour" | "Single Colour" | "None";

export interface KanbanField {
  id: string;
  label: string;
  /** Required fields (e.g. Lead Name) can't be removed from "Selected". */
  required?: boolean;
}

/** Shared swatches for Single / Multi Colour header styles. */
export const KANBAN_HEADER_PALETTE = [
  "#3B82F6", // blue
  "#06B6D4", // cyan
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F59E0B", // amber
  "#F97316", // orange
  "#10B981", // emerald
  "#14B8A6", // teal
  "#EF4444", // red
  "#64748B", // slate
] as const;

export const DEFAULT_SINGLE_HEADER_COLOR = "#6366F1";

export interface KanbanViewConfig {
  id: string;
  name: string;
  categorizeBy: string;
  aggregateBy: string;
  headerStyle: KanbanHeaderStyle | string;
  shareWith: ShareWith;
  /** Ordered list of selected field ids. */
  selectedFieldIds: string[];
  /** Which of the selected fields can be inline-edited directly on the card. */
  editableFieldIds: string[];
  /** Hex for Single Colour headers. */
  singleHeaderColor?: string;
  /** Hex per category/stage key for Multi Colour headers. */
  multiHeaderColors?: Record<string, string>;
}

export interface KanbanHeaderColorOption {
  id: string;
  label: string;
}

/** Resolve the header fill for a column given the saved view config. */
export function resolveKanbanHeaderColor(
  view: Pick<
    KanbanViewConfig,
    "headerStyle" | "singleHeaderColor" | "multiHeaderColors"
  >,
  columnKey: string,
  fallbackHex?: string,
): string | null {
  if (view.headerStyle === "None") return null;
  if (view.headerStyle === "Single Colour") {
    return view.singleHeaderColor || DEFAULT_SINGLE_HEADER_COLOR;
  }
  // Multi Colour
  return (
    view.multiHeaderColors?.[columnKey] ||
    fallbackHex ||
    DEFAULT_SINGLE_HEADER_COLOR
  );
}

/** Soft tint + solid accent for a column header. */
export function kanbanHeaderSurfaceStyle(hex: string | null): {
  className: string;
  style?: CSSProperties;
} {
  if (!hex) {
    return { className: "border border-slate-200/80 bg-slate-50" };
  }
  return {
    className: "border border-transparent",
    style: {
      backgroundColor: hexToRgba(hex, 0.16),
      boxShadow: `inset 3px 0 0 0 ${hex}`,
    },
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(99, 102, 241, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface KanbanViewControlsProps {
  /** Current view config — lives in the parent (Leads / Contacts / Deals / any future kanban). */
  view: KanbanViewConfig;
  /** All fields the entity exposes; `selectedFieldIds` on `view` picks which show. */
  availableFields: KanbanField[];
  categorizeByOptions: string[];
  aggregateByOptions: string[];
  headerStyleOptions: string[];
  /** Categories/stages shown in the Multi Colour palette picker. */
  headerColorOptions?: KanbanHeaderColorOption[];

  /** Called when the "Lead Pipeline ▾" label itself is clicked (e.g. open a view switcher). */
  onSelectorClick?: () => void;
  /** Called with the updated config when the user hits Save. */
  onSave: (next: KanbanViewConfig) => void;
  /** Omit to hide the Delete action (e.g. for a default/system view). */
  onDelete?: () => void;
  /** Omit to hide the Help icon in the modal header. */
  onHelp?: () => void;

  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Trigger — the pill + pencil, usable on any Kanban view             */
/* ------------------------------------------------------------------ */

export function KanbanViewControls({
  view,
  availableFields,
  categorizeByOptions,
  aggregateByOptions,
  headerStyleOptions,
  headerColorOptions,
  onSelectorClick,
  onSave,
  onDelete,
  onHelp,
  className = "",
}: KanbanViewControlsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <div className={`mt-3 flex w-fit items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={onSelectorClick}
          className="flex items-center gap-1.5 rounded-sm bg-white hover:bg-white px-3 py-1 text-sm font-medium text-foreground/70"
        >
          <span>{view.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Edit Kanban view settings"
          className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm hover:text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:text-zinc-300"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {isSettingsOpen && (
        <KanbanViewSettingsModal
          view={view}
          availableFields={availableFields}
          categorizeByOptions={categorizeByOptions}
          aggregateByOptions={aggregateByOptions}
          headerStyleOptions={headerStyleOptions}
          headerColorOptions={headerColorOptions}
          onHelp={onHelp}
          onClose={() => setIsSettingsOpen(false)}
          onDelete={
            onDelete
              ? () => {
                  onDelete();
                  setIsSettingsOpen(false);
                }
              : undefined
          }
          onSave={(next) => {
            onSave(next);
            setIsSettingsOpen(false);
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                               */
/* ------------------------------------------------------------------ */

interface KanbanViewSettingsModalProps {
  view: KanbanViewConfig;
  availableFields: KanbanField[];
  categorizeByOptions: string[];
  aggregateByOptions: string[];
  headerStyleOptions: string[];
  headerColorOptions?: KanbanHeaderColorOption[];
  onHelp?: () => void;
  onClose: () => void;
  onSave: (next: KanbanViewConfig) => void;
  onDelete?: () => void;
}

function ColorSwatchRow({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <p className="truncate text-[12px] font-medium text-slate-600 dark:text-zinc-300">
          {label}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {KANBAN_HEADER_PALETTE.map((hex) => {
          const selected = value.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              aria-label={`Color ${hex}`}
              title={hex}
              onClick={() => onChange(hex)}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                selected
                  ? "scale-110 border-slate-800 dark:border-white"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: hex }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function KanbanViewSettingsModal({
  view,
  availableFields,
  categorizeByOptions,
  aggregateByOptions,
  headerStyleOptions,
  headerColorOptions = [],
  onHelp,
  onClose,
  onSave,
  onDelete,
}: KanbanViewSettingsModalProps) {
  const [name, setName] = useState(view.name);
  const [categorizeBy, setCategorizeBy] = useState(view.categorizeBy);
  const [aggregateBy, setAggregateBy] = useState(view.aggregateBy);
  const [headerStyle, setHeaderStyle] = useState(view.headerStyle);
  const [shareWith, setShareWith] = useState<ShareWith>(view.shareWith);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    view.selectedFieldIds,
  );
  const [editableIds, setEditableIds] = useState<string[]>(
    view.editableFieldIds,
  );
  const [search, setSearch] = useState("");
  const [singleHeaderColor, setSingleHeaderColor] = useState(
    view.singleHeaderColor || DEFAULT_SINGLE_HEADER_COLOR,
  );
  const [multiHeaderColors, setMultiHeaderColors] = useState<
    Record<string, string>
  >(() => {
    const base: Record<string, string> = { ...(view.multiHeaderColors ?? {}) };
    headerColorOptions.forEach((opt, i) => {
      if (!base[opt.id]) {
        base[opt.id] =
          KANBAN_HEADER_PALETTE[i % KANBAN_HEADER_PALETTE.length] ??
          DEFAULT_SINGLE_HEADER_COLOR;
      }
    });
    return base;
  });

  const fieldsById = useMemo(
    () => new Map(availableFields.map((f) => [f.id, f])),
    [availableFields],
  );

  const selectedFields = selectedIds
    .map((id) => fieldsById.get(id))
    .filter((f): f is KanbanField => Boolean(f));

  const availableList = availableFields.filter(
    (f) =>
      !selectedIds.includes(f.id) &&
      f.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const addField = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const removeField = (id: string) => {
    const field = fieldsById.get(id);
    if (field?.required) return;
    setSelectedIds((prev) => prev.filter((f) => f !== id));
    setEditableIds((prev) => prev.filter((f) => f !== id));
  };

  const showColourNote =
    headerStyle === "Multi Colour" &&
    (categorizeBy === "Lead Status" || categorizeBy === "Status");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...view,
      name: name.trim(),
      categorizeBy,
      aggregateBy,
      headerStyle,
      shareWith,
      selectedFieldIds: selectedIds,
      editableFieldIds: editableIds.filter((id) => selectedIds.includes(id)),
      singleHeaderColor,
      multiHeaderColors,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            Kanban View - Settings
          </h2>
          <button
            type="button"
            onClick={onHelp}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <Field label="Kanban View Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-blue-300 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Enter a view name"
            />
          </Field>

          <Field label="Categorize By" info>
            <Select
              value={categorizeBy}
              onChange={setCategorizeBy}
              options={categorizeByOptions}
              highlighted
            />
          </Field>

          <Field label="Aggregate By" info>
            <Select
              value={aggregateBy}
              onChange={setAggregateBy}
              options={aggregateByOptions}
            />
          </Field>

          <Field label="Header Style">
            <Select
              value={headerStyle}
              onChange={setHeaderStyle}
              options={headerStyleOptions}
              highlighted
            />
            {showColourNote && (
              <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                Note: Coloring option is enabled for {categorizeBy} and the
                colors assigned for each picklist option will be applied in the
                header style.
              </p>
            )}

            {headerStyle === "Single Colour" ? (
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="mb-2 text-[12px] font-medium text-slate-600 dark:text-zinc-300">
                  Header colour
                </p>
                <ColorSwatchRow
                  value={singleHeaderColor}
                  onChange={setSingleHeaderColor}
                />
              </div>
            ) : null}

            {headerStyle === "Multi Colour" ? (
              <div className="mt-3 max-h-48 space-y-3 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-[12px] font-medium text-slate-600 dark:text-zinc-300">
                  Colour per column
                </p>
                {(headerColorOptions.length
                  ? headerColorOptions
                  : [{ id: "default", label: "All columns" }]
                ).map((opt) => (
                  <ColorSwatchRow
                    key={opt.id}
                    label={opt.label}
                    value={
                      multiHeaderColors[opt.id] || DEFAULT_SINGLE_HEADER_COLOR
                    }
                    onChange={(hex) =>
                      setMultiHeaderColors((prev) => ({
                        ...prev,
                        [opt.id]: hex,
                      }))
                    }
                  />
                ))}
              </div>
            ) : null}
          </Field>

          {/* Share with */}
          <div className="flex items-center gap-4 pt-1">
            <span className="w-28 shrink-0 text-sm text-slate-500 dark:text-zinc-400">
              Share this with:
            </span>
            <div className="flex items-center gap-4 text-sm text-slate-700 dark:text-zinc-200">
              {(
                [
                  ["only-me", "Only me"],
                  ["everyone", "Everyone"],
                  ["selected-users", "Selected users"],
                ] as [ShareWith, string][]
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="shareWith"
                    checked={shareWith === value}
                    onChange={() => setShareWith(value)}
                    className="accent-blue-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Select Fields */}
          <div className="pt-1">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-zinc-200">
              Select Fields
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs text-slate-500 dark:text-zinc-400">
                  Available
                </p>
                <div className="rounded-md border border-slate-200 dark:border-zinc-700">
                  <div className="flex items-center gap-1.5 border-b border-slate-200 px-2 py-1.5 dark:border-zinc-700">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search"
                      className="w-full text-sm outline-none dark:bg-transparent dark:text-zinc-100"
                    />
                  </div>
                  <ul className="h-40 overflow-y-auto text-sm">
                    {availableList.map((field) => (
                      <li key={field.id}>
                        <button
                          type="button"
                          onClick={() => addField(field.id)}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-700 hover:bg-blue-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          {field.label}
                          {field.required && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </button>
                      </li>
                    ))}
                    {availableList.length === 0 && (
                      <li className="px-3 py-2 text-xs text-slate-400">
                        No matching fields
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs text-slate-500 dark:text-zinc-400">
                  Selected
                </p>
                <div className="h-[169px] overflow-y-auto rounded-md border border-slate-200 text-sm dark:border-zinc-700">
                  <ul>
                    {selectedFields.map((field) => (
                      <li
                        key={field.id}
                        className="flex items-center justify-between px-3 py-1.5 text-slate-700 dark:text-zinc-200"
                      >
                        <span>
                          {field.label}
                          {field.required && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </span>
                        {!field.required && (
                          <button
                            type="button"
                            onClick={() => removeField(field.id)}
                            aria-label={`Remove ${field.label}`}
                            className="text-slate-300 hover:text-slate-500 dark:hover:text-zinc-300"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-zinc-800">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-sm font-medium text-red-500 hover:text-red-600"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small shared bits                                                   */
/* ------------------------------------------------------------------ */

function Field({
  label,
  info,
  children,
}: {
  label: string;
  info?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-1.5 flex w-28 shrink-0 items-center gap-1 text-sm text-slate-500 dark:text-zinc-400">
        {label}
        {info && <HelpCircle className="h-3 w-3 text-slate-300" />}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  highlighted,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  highlighted?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full appearance-none rounded-md border px-3 py-1.5 text-sm text-slate-800 outline-none dark:bg-zinc-800 dark:text-zinc-100 ${
        highlighted
          ? "border-blue-300 focus:border-blue-500"
          : "border-slate-200 focus:border-blue-400 dark:border-zinc-700"
      }`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
