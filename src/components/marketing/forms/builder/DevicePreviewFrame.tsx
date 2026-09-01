"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FieldRenderer } from "./FieldRenderer";
import type { FormPage } from "@/lib/form-builder/types";
import type { FormTheme } from "@/lib/form-builder/themes";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<PreviewDevice, string> = {
  desktop: "780px",
  tablet: "600px",
  mobile: "380px",
};

interface DevicePreviewFrameProps {
  device: PreviewDevice;
  formName: string;
  pages: FormPage[];
  theme: FormTheme;
}

export function DevicePreviewFrame({
  device,
  formName,
  pages,
  theme,
}: DevicePreviewFrameProps) {
  const visiblePages = pages.filter((p) => !p.hidden);
  const [currentIndex, setCurrentIndex] = useState(0);

  // keep index in range if the page set changes while previewing
  useEffect(() => {
    setCurrentIndex((i) => Math.min(i, Math.max(visiblePages.length - 1, 0)));
  }, [visiblePages.length]);

  const currentPage = visiblePages[currentIndex];
  const isMultiPage = visiblePages.length > 1;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === visiblePages.length - 1;

  const handleNext = () =>
    setCurrentIndex((i) => Math.min(i + 1, visiblePages.length - 1));
  const handleBack = () => setCurrentIndex((i) => Math.max(i - 1, 0));
  const handleSubmit = () =>
    console.log("TODO(api): submit form", { formName, pages });

  return (
    <div
      className="mx-auto overflow-hidden rounded-xl bg-white shadow-lg transition-[width] duration-200"
      style={{ width: DEVICE_WIDTHS[device] }}
    >
      <div
        className="px-8 py-6 text-center text-2xl font-semibold text-slate-900"
        style={{ background: theme.gradient }}
      >
        {formName || "Untitled Form"}
      </div>

      {isMultiPage && (
        <div className="border-t border-slate-100 px-8 py-6">
          <div className="flex items-center justify-center">
            {visiblePages.map((page, index) => (
              <div key={page.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white transition-colors",
                      index <= currentIndex ? "bg-slate-700" : "bg-slate-300",
                    )}
                  >
                    {index < currentIndex ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      index === currentIndex
                        ? "text-slate-900"
                        : "text-slate-400",
                    )}
                  >
                    {page.title}
                  </span>
                </div>
                {index < visiblePages.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 mb-5 h-0.5 w-16 transition-colors sm:w-24",
                      index < currentIndex ? "bg-slate-700" : "bg-slate-300",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={cn(
          "space-y-5 px-8 py-6",
          !isMultiPage && "border-t border-slate-100",
        )}
      >
        {!currentPage || currentPage.fields.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {currentPage ? "This page is empty." : "No pages available."}
          </p>
        ) : (
          currentPage.fields.map((field) => (
            <div key={field.id}>
              <p className="mb-1.5 text-sm font-semibold text-slate-900">
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </p>
              <FieldRenderer field={field} disabled={false} />
            </div>
          ))
        )}

        {currentPage && (
          <div className="flex items-center justify-between pt-2">
            <div>
              {!isFirst && (
                <Button
                  variant="outline"
                  className="rounded-full px-8"
                  style={{
                    borderColor: theme.accentColor,
                    color: theme.accentColor,
                  }}
                  onClick={handleBack}
                >
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4">
              {isLast ? (
                <Button
                  className="rounded-full px-8"
                  style={{
                    backgroundColor: theme.accentColor,
                    borderColor: theme.accentColor,
                  }}
                  onClick={handleSubmit}
                >
                  Submit
                </Button>
              ) : (
                <Button
                  className="rounded-full px-8"
                  style={{
                    backgroundColor: theme.accentColor,
                    borderColor: theme.accentColor,
                  }}
                  onClick={handleNext}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {isMultiPage && (
        <div className="px-8 pb-4 text-right text-xs text-muted-foreground">
          {currentIndex + 1}/{visiblePages.length}
        </div>
      )}
    </div>
  );
}
