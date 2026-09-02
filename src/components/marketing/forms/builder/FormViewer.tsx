"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FormField, FormPage } from "@/lib/form-builder/types";
import { FieldRenderer } from "@/components/marketing/forms/builder/FieldRenderer";
import { ColumnLayoutField } from "@/components/marketing/forms/builder/ColumnLayoutField";
import { CheckCircle2 } from "lucide-react";

const LAYOUT_TYPES = new Set(["col-2", "col-3"]);

interface FormViewerProps {
  title: string;
  pages: FormPage[];
}

export function FormViewer({ title, pages }: FormViewerProps) {
  const visiblePages = useMemo(() => pages.filter((p) => !p.hidden), [pages]);

  const [pageIndex, setPageIndex] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  const currentPage = visiblePages[pageIndex];
  const isFirst = pageIndex === 0;
  const isLast = pageIndex === visiblePages.length - 1;

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleNext = () => {
    if (!isLast) setPageIndex((i) => i + 1);
  };

  const handleBack = () => {
    if (!isFirst) setPageIndex((i) => i - 1);
  };

  const handleSubmit = () => {
    // TODO(api): POST { formSlug, values } to submissions endpoint once it exists
    console.log("submit form", values);
    setSubmitted(true);
  };

  const renderField = (field: FormField) => {
    const isLayout = LAYOUT_TYPES.has(field.type);
    const hideLabel = field.settings?.hideLabel === true;

    return (
      <div key={field.id} className="mb-4">
        {!isLayout && !hideLabel && (
          <div className="mb-1.5 text-sm font-medium text-foreground">
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </div>
        )}

        {isLayout ? (
          <ColumnLayoutField
            field={field}
            readOnly
            onDropFieldType={() => {}}
            onRemoveNestedField={() => {}}
            onSelectField={() => {}}
            onResizeColumns={() => {}}
          />
        ) : (
          <FieldRenderer
            field={field}
            value={values[field.id]}
            onChange={(value) => handleFieldChange(field.id, value)}
          />
        )}
      </div>
    );
  };

  if (submitted) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-card border border-border p-8 text-center shadow-xl ring-1 ring-slate-900/5 transition-all animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Thank you for your submission!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Your response has been successfully recorded. We appreciate you
            taking the time to share this with us.
          </p>
          <div className="mt-6 border-t border-border pt-6">
            <p className="text-xs text-muted-foreground/80">
              You can now safely close this window.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPage) {
    return (
      <div className="mx-auto mt-20 w-[680px] rounded-xl border border-border bg-card p-10 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          This form has no visible pages.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[680px]">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {currentPage.title && (
          <h2 className="mb-6 text-center text-xl font-semibold text-foreground">
            {currentPage.title}
          </h2>
        )}

        {currentPage.fields.map(renderField)}

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <div>
            {!isFirst && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4">
            {isLast ? (
              <Button onClick={handleSubmit}>Submit</Button>
            ) : (
              <Button onClick={handleNext}>Next</Button>
            )}
            <span className="text-sm text-muted-foreground">
              {pageIndex + 1}/{visiblePages.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
