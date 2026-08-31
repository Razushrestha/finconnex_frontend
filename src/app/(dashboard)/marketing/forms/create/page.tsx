"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldPalette } from "@/components/marketing/forms/builder/FieldPalette";
import { FormCanvas } from "@/components/marketing/forms/builder/FormCanvas";
import { FieldPropertiesPanel } from "@/components/marketing/forms/builder/FieldPropertiesPanel";
import { FormPreviewOverlay } from "@/components/marketing/forms/builder/FormPreviewOverlay";
import {
  createDefaultField,
  FIELD_LIBRARY,
} from "@/lib/form-builder/field-library";
import {
  removeFieldById,
  updateFieldById,
  insertFieldInColumn,
} from "@/lib/form-builder/field-tree";
import type {
  FieldDefinition,
  FieldSettings,
  FormField,
  FormPage,
} from "@/lib/form-builder/types";

export default function FormBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formName = searchParams.get("name") ?? "Untitled Form";

  const [pages, setPages] = useState<FormPage[]>([
    { id: crypto.randomUUID(), title: formName || "Untitled Form", fields: [] },
  ]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const updatePageFields = (
    pageId: string,
    updater: (fields: FormField[]) => FormField[],
  ) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId ? { ...p, fields: updater(p.fields) } : p,
      ),
    );
  };

  const addFieldAt = (pageId: string, defn: FieldDefinition, index: number) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      ...createDefaultField(defn),
    };
    updatePageFields(pageId, (fields) => {
      const next = [...fields];
      next.splice(index, 0, newField);
      return next;
    });
  };

  const handleAddField = (defn: FieldDefinition) => {
    const firstPage = pages[0];
    addFieldAt(firstPage.id, defn, firstPage.fields.length);
  };

  const handleDropFieldType = (
    pageId: string,
    fieldType: string,
    index: number,
  ) => {
    const defn = FIELD_LIBRARY.find((f) => f.type === fieldType);
    if (defn) addFieldAt(pageId, defn, index);
  };

  const handleRemoveField = (pageId: string, id: string) => {
    updatePageFields(pageId, (fields) => removeFieldById(fields, id));
  };

  // Reorder existing field when dragged and dropped onto a slot index
  const handleReorderField = (
    pageId: string,
    fieldId: string,
    targetIndex: number,
  ) => {
    updatePageFields(pageId, (fields) => {
      const oldIndex = fields.findIndex((f) => f.id === fieldId);
      if (oldIndex === -1 || oldIndex === targetIndex) return fields;

      const next = [...fields];
      const [moved] = next.splice(oldIndex, 1);

      // If moving downwards, splice index adjusts because of the removed item.
      // If moving upwards (like to index 0), it inserts precisely at targetIndex.
      let insertAtIndex = targetIndex;
      if (oldIndex < targetIndex) {
        insertAtIndex = targetIndex - 1;
      }

      // Ensure boundaries are respected
      insertAtIndex = Math.max(0, Math.min(insertAtIndex, next.length));

      next.splice(insertAtIndex, 0, moved);
      return next;
    });
  };

  const handleSaveFieldSettings = (
    fieldId: string,
    label: string,
    settings: FieldSettings,
  ) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        fields: updateFieldById(p.fields, fieldId, { label, settings }),
      })),
    );

    setSelectedField((prev) =>
      prev && prev.id === fieldId ? { ...prev, label, settings } : prev,
    );
  };

  const handleDropIntoColumn = (
    pageId: string,
    layoutFieldId: string,
    columnIndex: number,
    fieldType: string,
  ) => {
    const defn = FIELD_LIBRARY.find((f) => f.type === fieldType);
    if (!defn || defn.type === "col-2" || defn.type === "col-3") return;
    const newField: FormField = {
      id: crypto.randomUUID(),
      ...createDefaultField(defn),
    };
    updatePageFields(pageId, (fields) =>
      insertFieldInColumn(fields, layoutFieldId, columnIndex, newField),
    );
  };

  const handleResizeColumns = (
    pageId: string,
    layoutFieldId: string,
    widths: number[],
  ) => {
    updatePageFields(pageId, (fields) =>
      updateFieldById(fields, layoutFieldId, { columnWidths: widths }),
    );
  };

  const handleAddPage = (afterIndex: number) => {
    setPages((prev) => {
      const newPage: FormPage = {
        id: crypto.randomUUID(),
        title: `Page ${prev.length + 1}`,
        fields: [],
      };
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newPage);
      return next;
    });
  };

  const handleTogglePageHidden = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, hidden: !p.hidden } : p)),
    );
  };

  const handleGoToPage = (index: number) => {
    console.log("go to page", index);
  };

  const handleUpdatePageTitle = (pageId: string, title: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, title } : p)),
    );
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">{formName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-1.5 h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={() => {
              const formSlug = encodeURIComponent(
                formName.toLowerCase().replace(/\s+/g, "-"),
              );
              window.open(`/forms/view/${formSlug}`, "_blank");
            }}
          >
            Access Form
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <FieldPalette onAddField={handleAddField} />
        <div className="flex-1 overflow-y-auto bg-muted/30 flex flex-col">
          <FormCanvas
            pages={pages}
            onDropFieldType={handleDropFieldType}
            onReorderField={handleReorderField}
            onRemoveField={handleRemoveField}
            onSelectField={setSelectedField}
            onDropIntoColumn={handleDropIntoColumn}
            onRemoveNestedField={handleRemoveField}
            onResizeColumns={handleResizeColumns}
            onAddPage={handleAddPage}
            onTogglePageHidden={handleTogglePageHidden}
            onUpdatePageTitle={handleUpdatePageTitle}
            onGoToPage={handleGoToPage}
          />
        </div>
      </div>

      <FieldPropertiesPanel
        field={selectedField}
        onClose={() => setSelectedField(null)}
        onSave={handleSaveFieldSettings}
      />

      <FormPreviewOverlay
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        formName={formName}
        pages={pages}
      />
    </div>
  );
}
