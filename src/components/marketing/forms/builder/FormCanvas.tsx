"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { FormField, FormPage } from "@/lib/form-builder/types";
import { FormPageCard } from "./FormPageCard";

interface FormCanvasProps {
  pages: FormPage[];
  onDropFieldType: (pageId: string, fieldType: string, index: number) => void;
  onReorderField: (pageId: string, fieldId: string, index: number) => void;
  onRemoveField: (pageId: string, id: string) => void;
  onSelectField: (field: FormField) => void;
  onDropIntoColumn: (
    pageId: string,
    layoutFieldId: string,
    columnIndex: number,
    fieldType: string,
  ) => void;
  onRemoveNestedField: (pageId: string, fieldId: string) => void;
  onResizeColumns: (
    pageId: string,
    layoutFieldId: string,
    widths: number[],
  ) => void;
  onAddPage: (afterIndex: number) => void;
  onTogglePageHidden: (pageId: string) => void;
  onGoToPage: (index: number) => void;
  onUpdatePageTitle: (pageId: string, title: string) => void;
}

export function FormCanvas({
  pages,
  onDropFieldType,
  onReorderField,
  onRemoveField,
  onSelectField,
  onDropIntoColumn,
  onRemoveNestedField,
  onResizeColumns,
  onAddPage,
  onTogglePageHidden,
  onGoToPage,
  onUpdatePageTitle,
}: FormCanvasProps) {
  const [dropTarget, setDropTarget] = useState<{
    pageId: string;
    index: number;
  } | null>(null);

  const handleDragOverSlot =
    (pageId: string, index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDropTarget({ pageId, index });
    };

  const handleDrop =
    (pageId: string, index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const fieldType = e.dataTransfer.getData("application/x-field-type");
      const fieldId = e.dataTransfer.getData("application/x-field-id");

      if (fieldType) {
        onDropFieldType(pageId, fieldType, index);
      } else if (fieldId) {
        onReorderField(pageId, fieldId, index);
      }
      setDropTarget(null);
    };

  return (
    <div className="mx-auto w-[680px] py-8 flex flex-col items-center">
      <div className="mb-4 flex justify-center">
        <button
          type="button"
          onClick={() => console.log("TODO(api): add welcome page")}
          className="rounded-full border border-dashed border-primary/50 px-4 py-1.5 text-sm text-primary hover:bg-accent/30"
        >
          + Welcome Page
        </button>
      </div>
      {pages.map((page, index) => (
        <div key={page.id} className="w-full">
          <FormPageCard
            page={page}
            pageIndex={index}
            totalPages={pages.length}
            dropIndex={dropTarget?.pageId === page.id ? dropTarget.index : null}
            onDragOverSlot={(i) => handleDragOverSlot(page.id, i)}
            onDrop={(i) => handleDrop(page.id, i)}
            onRemoveField={(id) => onRemoveField(page.id, id)}
            onSelectField={onSelectField}
            onDropIntoColumn={(layoutFieldId, colIndex, fieldType) =>
              onDropIntoColumn(page.id, layoutFieldId, colIndex, fieldType)
            }
            onRemoveNestedField={(fieldId) =>
              onRemoveNestedField(page.id, fieldId)
            }
            onResizeColumns={(layoutFieldId, widths) =>
              onResizeColumns(page.id, layoutFieldId, widths)
            }
            onToggleHidden={() => onTogglePageHidden(page.id)}
            onUpdatePageTitle={(title) => onUpdatePageTitle(page.id, title)}
            onBack={() => onGoToPage(index - 1)}
            onNext={() => onGoToPage(index + 1)}
          />

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 border-t border-dashed border-border" />
            <button
              type="button"
              onClick={() => onAddPage(index)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
              aria-label="Add page"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="h-px flex-1 border-t border-dashed border-border" />
          </div>
        </div>
      ))}
    </div>
  );
}
