"use client";

import { useRef } from "react";
import { GripVertical, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FormField, FormPage } from "@/lib/form-builder/types";
import { FieldRenderer } from "./FieldRenderer";
import { ColumnLayoutField } from "./ColumnLayoutField";

const LAYOUT_TYPES = new Set(["col-2", "col-3"]);

interface FormPageCardProps {
  page: FormPage;
  pageIndex: number;
  totalPages: number;
  isActive: boolean;
  onActivate: () => void;
  dropIndex: number | null;
  draggingFieldId: string | null;
  onDragOverSlot: (index: number) => (e: React.DragEvent) => void;
  onDrop: (index: number) => (e: React.DragEvent) => void;
  onFieldDragStart: (fieldId: string) => void;
  onDragEnd: () => void;
  onRemoveField: (id: string) => void;
  onSelectField: (field: FormField) => void;
  onDropIntoColumn: (
    layoutFieldId: string,
    columnIndex: number,
    fieldType: string,
  ) => void;
  onRemoveNestedField: (fieldId: string) => void;
  onResizeColumns: (layoutFieldId: string, widths: number[]) => void;
  onToggleHidden: () => void;
  onUpdatePageTitle: (title: string) => void;
  onBack: () => void;
  onNext: () => void;
}

// Builds a lightweight ghost element for the native drag image, styled to
// match the dashed-box drop indicator. Removed from the DOM right after the
// browser snapshots it — setDragImage copies the element synchronously, so
// it's safe to detach on the next frame.
function setFieldDragPreview(e: React.DragEvent, label: string) {
  const el = document.createElement("div");
  el.textContent = label;
  Object.assign(el.style, {
    position: "absolute",
    top: "-9999px",
    left: "-9999px",
    padding: "6px 12px",
    background: "white",
    border: "1px dashed rgb(52 211 153)", // emerald-400 — swap for a semantic token if you have one
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    color: "rgb(17 24 39)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
  e.dataTransfer.setDragImage(el, -12, 14);
  requestAnimationFrame(() => document.body.removeChild(el));
}

// Dashed placeholder box shown at the target insertion point while
// dragging, replacing the earlier thin-line indicator.
function DropIndicator({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border-2 border-dashed transition-all duration-150 ease-out",
        active
          ? "my-2 h-16 border-emerald-400 bg-emerald-50/40 opacity-100"
          : "my-0 h-0 border-transparent opacity-0",
      )}
    />
  );
}

export function FormPageCard({
  page,
  pageIndex,
  totalPages,
  isActive,
  onActivate,
  dropIndex,
  draggingFieldId,
  onDragOverSlot,
  onDrop,
  onFieldDragStart,
  onDragEnd,
  onRemoveField,
  onSelectField,
  onDropIntoColumn,
  onRemoveNestedField,
  onResizeColumns,
  onToggleHidden,
  onUpdatePageTitle,
  onBack,
  onNext,
}: FormPageCardProps) {
  const isFirst = pageIndex === 0;
  const isLast = pageIndex === totalPages - 1;
  const fields = page.fields;
  const listRef = useRef<HTMLDivElement>(null);

  const resolveIndexFromY = (clientY: number): number => {
    if (!listRef.current) return fields.length;
    const rows = Array.from(
      listRef.current.querySelectorAll<HTMLElement>("[data-field-row]"),
    );
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (clientY < midpoint) return i;
    }
    return fields.length;
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(
      "application/x-field-id",
    )
      ? "move"
      : "copy";
    onDragOverSlot(resolveIndexFromY(e.clientY))(e);
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(resolveIndexFromY(e.clientY))(e);
  };

  return (
    <div
      onMouseDownCapture={onActivate}
      className={cn(
        "relative w-[680px] min-h-[320px] rounded-xl border bg-card flex flex-col mx-auto shadow-sm transition-colors duration-150",
        isActive ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
      )}
    >
      {!isFirst && (
        <button
          type="button"
          onClick={onToggleHidden}
          className={cn(
            "absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg",
            page.hidden
              ? "bg-amber-100 text-amber-600"
              : "bg-muted text-muted-foreground",
          )}
          aria-label={page.hidden ? "Show page" : "Hide page"}
        >
          {page.hidden ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}

      <div className="rounded-t-xl border-b border-border bg-accent/20 px-6 py-4 shrink-0 flex items-center justify-center">
        <input
          type="text"
          value={page.title}
          onChange={(e) => onUpdatePageTitle(e.target.value)}
          placeholder="Page Title"
          className="w-full text-center bg-transparent text-xl font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-2 py-1"
        />
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-4 p-6"
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
      >
        {fields.length === 0 && (
          <div
            className={cn(
              "flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-center text-sm text-muted-foreground transition-colors duration-150",
              dropIndex === 0
                ? "border-emerald-400 bg-emerald-50/40"
                : "border-border",
            )}
          >
            {isFirst
              ? "Drag a field here, or click one on the left to add it"
              : "This page is empty. Drag fields from the left panel and drop here!"}
          </div>
        )}

        {fields.map((field, index) => {
          const isLayout = LAYOUT_TYPES.has(field.type);
          const hideLabel = field.settings?.hideLabel === true;
          const isDragging = draggingFieldId === field.id;

          return (
            <div key={field.id}>
              <DropIndicator active={dropIndex === index} />
              <div
                data-field-row
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-field-id", field.id);
                  e.dataTransfer.effectAllowed = "move";
                  setFieldDragPreview(e, field.label || "Field");
                  onFieldDragStart(field.id);
                }}
                onDragEnd={onDragEnd}
                onClick={() => {
                  onSelectField(field);
                }}
                className={cn(
                  "group relative select-none rounded-lg border border-transparent p-3 cursor-grab active:cursor-grabbing",
                  "transition-[opacity,transform,background-color,border-color] duration-150 ease-out",
                  "hover:border-border hover:bg-accent/10",
                  isDragging && "opacity-40 scale-[0.98]",
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    {!isLayout && !hideLabel && (
                      <>
                        {field.label}
                        {field.required && (
                          <span className="text-destructive">*</span>
                        )}
                      </>
                    )}
                    {isLayout && (
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {field.type === "col-2"
                          ? "2-Column Layout"
                          : "3-Column Layout"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveField(field.id);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                      aria-label="Remove field"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isLayout ? (
                  <ColumnLayoutField
                    field={field}
                    onDropFieldType={(colIndex, fieldType) =>
                      onDropIntoColumn(field.id, colIndex, fieldType)
                    }
                    onRemoveNestedField={onRemoveNestedField}
                    onSelectField={onSelectField}
                    onResizeColumns={(widths) =>
                      onResizeColumns(field.id, widths)
                    }
                  />
                ) : (
                  <FieldRenderer field={field} />
                )}
              </div>
            </div>
          );
        })}

        {fields.length > 0 && (
          <DropIndicator active={dropIndex === fields.length} />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-6 py-4 shrink-0">
          <div>
            {!isFirst && (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4">
            {!isLast && <Button onClick={onNext}>Next</Button>}
            <span className="text-sm text-muted-foreground">
              {pageIndex + 1}/{totalPages}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
