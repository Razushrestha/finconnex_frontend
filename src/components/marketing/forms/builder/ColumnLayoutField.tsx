"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronsLeftRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormField } from "@/lib/form-builder/types";
import { FieldRenderer } from "./FieldRenderer";

interface ColumnLayoutFieldProps {
  field: FormField; // type "col-2" | "col-3"
  onDropFieldType: (columnIndex: number, fieldType: string) => void;
  onRemoveNestedField: (fieldId: string) => void;
  onSelectField: (field: FormField) => void;
  onResizeColumns: (widths: number[]) => void;
  readOnly?: boolean;
}

const MIN_WIDTH = 15;

export function ColumnLayoutField({
  field,
  onDropFieldType,
  onRemoveNestedField,
  onSelectField,
  onResizeColumns,
  readOnly = false,
}: ColumnLayoutFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragDividerIndex, setDragDividerIndex] = useState<number | null>(null);
  const [dropColumn, setDropColumn] = useState<number | null>(null);

  const columns = field.columns ?? [];
  const widths = field.columnWidths ?? columns.map(() => 100 / columns.length);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragDividerIndex === null || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;

      const leftStart = widths
        .slice(0, dragDividerIndex)
        .reduce((a, b) => a + b, 0);
      const pairTotal = widths[dragDividerIndex] + widths[dragDividerIndex + 1];
      let newLeft = pct - leftStart;
      newLeft = Math.max(MIN_WIDTH, Math.min(pairTotal - MIN_WIDTH, newLeft));
      const newRight = pairTotal - newLeft;

      const next = [...widths];
      next[dragDividerIndex] = Math.round(newLeft);
      next[dragDividerIndex + 1] = Math.round(newRight);
      onResizeColumns(next);
    },
    [dragDividerIndex, widths, onResizeColumns],
  );

  const handleMouseUp = useCallback(() => setDragDividerIndex(null), []);

  useEffect(() => {
    if (dragDividerIndex === null) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragDividerIndex, handleMouseMove, handleMouseUp]);

  const handleDragOverColumn = (index: number) => (e: React.DragEvent) => {
    if (readOnly) return;
    if (!e.dataTransfer.types.includes("application/x-field-type")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropColumn(index);
  };

  const handleDropOnColumn = (index: number) => (e: React.DragEvent) => {
    if (readOnly) return;
    if (!e.dataTransfer.types.includes("application/x-field-type")) return;
    e.preventDefault();
    const fieldType = e.dataTransfer.getData("application/x-field-type");
    if (fieldType) onDropFieldType(index, fieldType);
    setDropColumn(null);
  };

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-dashed border-primary/40 bg-accent/5 p-4"
    >
      <div className="relative flex">
        {columns.map((colFields, index) => (
          <div
            key={index}
            className="relative flex flex-col"
            style={{ width: `${widths[index]}%` }}
          >
            <div className="mb-1 text-center text-xs font-semibold text-amber-500">
              {widths[index]}%
            </div>

            <div
              onDragOver={handleDragOverColumn(index)}
              onDragLeave={() => setDropColumn((c) => (c === index ? null : c))}
              onDrop={handleDropOnColumn(index)}
              className={cn(
                "mx-1.5 min-h-[64px] flex-1 space-y-2 rounded-lg border p-2",
                colFields.length === 0 &&
                  "flex items-center justify-center border-dashed",
                dropColumn === index
                  ? "border-primary bg-accent/20"
                  : "border-border bg-muted/30",
              )}
            >
              {colFields.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  {readOnly ? "" : "Drag and drop fields here"}
                </span>
              ) : (
                colFields.map((nested) => (
                  <div
                    key={nested.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!readOnly) onSelectField(nested);
                    }}
                    className={cn(
                      "group relative rounded-md border border-transparent p-2",
                      !readOnly &&
                        "cursor-pointer hover:border-border hover:bg-accent/10",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {nested.label}
                        {nested.required && (
                          <span className="text-destructive"> *</span>
                        )}
                      </span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveNestedField(nested.id);
                          }}
                          className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-accent hover:text-destructive group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <FieldRenderer field={nested} />
                  </div>
                ))
              )}
            </div>
          </div>
        ))}

        {columns.slice(0, -1).map((_, dividerIndex) => {
          const leftOffset = widths
            .slice(0, dividerIndex + 1)
            .reduce((a, b) => a + b, 0);
          return (
            <div
              key={dividerIndex}
              className="absolute top-0 z-10 flex h-full -translate-x-1/2 flex-col items-center"
              style={{ left: `${leftOffset}%` }}
            >
              <div className="h-full w-0.5 bg-primary" />
              {!readOnly && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setDragDividerIndex(dividerIndex);
                  }}
                  className="absolute top-1/2 flex h-6 w-8 -translate-y-1/2 cursor-col-resize items-center justify-center rounded-full bg-amber-400 text-white shadow"
                >
                  <ChevronsLeftRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
