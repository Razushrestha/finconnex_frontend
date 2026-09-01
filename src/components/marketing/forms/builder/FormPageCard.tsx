"use client";

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
  dropIndex: number | null;
  onDragOverSlot: (index: number) => (e: React.DragEvent) => void;
  onDrop: (index: number) => (e: React.DragEvent) => void;
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

export function FormPageCard({
  page,
  pageIndex,
  totalPages,
  dropIndex,
  onDragOverSlot,
  onDrop,
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

  return (
    <div className="relative w-[680px] min-h-[320px] rounded-xl border border-border bg-card flex flex-col mx-auto shadow-sm">
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

      {/* Editable Page Header */}
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
        className="flex-1 space-y-4 p-6"
        onDragOver={onDragOverSlot(fields.length)}
        onDrop={onDrop(fields.length)}
      >
        {fields.length === 0 && (
          <div
            className={cn(
              "flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-center text-sm text-muted-foreground",
              dropIndex === 0 ? "border-primary bg-accent/20" : "border-border",
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

          return (
            <div key={field.id}>
              {dropIndex === index && (
                <div className="mb-2 h-1 rounded-full bg-primary" />
              )}
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-field-id", field.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  onDragOverSlot(index)(e);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDrop(index)(e);
                }}
                onClick={() => {
                  onSelectField(field);
                }}
                className="group relative cursor-pointer rounded-lg border border-transparent p-3 hover:border-border hover:bg-accent/10"
              >
                {/* Unified Field Header */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
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

                  {/* Delete Action */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

        {fields.length > 0 && dropIndex === fields.length && (
          <div className="h-1 rounded-full bg-primary" />
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
