"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Monitor,
  Tablet,
  Smartphone,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FORM_THEMES, DEFAULT_THEME_ID } from "@/lib/form-builder/themes";
import type { FormPage } from "@/lib/form-builder/types";
import { DevicePreviewFrame, type PreviewDevice } from "./DevicePreviewFrame";

interface FormPreviewOverlayProps {
  open: boolean;
  onClose: () => void;
  formName: string;
  pages: FormPage[];
}

const DEVICE_OPTIONS: {
  id: PreviewDevice;
  icon: typeof Monitor;
  label: string;
}[] = [
  { id: "desktop", icon: Monitor, label: "Desktop" },
  { id: "tablet", icon: Tablet, label: "Tablet" },
  { id: "mobile", icon: Smartphone, label: "Mobile" },
];

export function FormPreviewOverlay({
  open,
  onClose,
  formName,
  pages,
}: FormPreviewOverlayProps) {
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [themeApplied, setThemeApplied] = useState(DEFAULT_THEME_ID);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // lock background scroll while the overlay is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const theme = FORM_THEMES.find((t) => t.id === themeId) ?? FORM_THEMES[0];

  const overlay = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-800">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between bg-slate-900 px-4 py-3">
        <div className="flex items-baseline gap-2 text-white">
          <span className="text-base font-semibold">
            {FORM_THEMES.find((t) => t.id === themeApplied)?.name ?? "Default"}
          </span>
          <span className="text-sm text-amber-400">(Preview)</span>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-1">
          {DEVICE_OPTIONS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDevice(id)}
              aria-label={label}
              className={cn(
                "flex items-center justify-center rounded-md p-2 transition-colors",
                device === id
                  ? "border-b-2 border-emerald-400 text-emerald-400"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <span
            className={cn(
              "text-sm font-medium",
              themeId === themeApplied ? "text-slate-500" : "text-slate-300",
            )}
          >
            {themeId === themeApplied ? "Applied" : "Not applied"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-white hover:bg-white/10"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-10">
          <DevicePreviewFrame
            device={device}
            formName={formName}
            pages={pages}
            theme={theme}
          />
        </div>

        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute top-1/2 z-10 flex h-9 w-6 -translate-y-1/2 items-center justify-center rounded-l-full bg-slate-900 text-white shadow-md transition-[right] duration-200"
          style={{ right: sidebarOpen ? "340px" : "0px" }}
          aria-label={
            sidebarOpen ? "Collapse theme panel" : "Expand theme panel"
          }
        >
          {sidebarOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <div
          className={cn(
            "shrink-0 overflow-hidden bg-slate-900 transition-[width] duration-200",
            sidebarOpen ? "w-[340px]" : "w-0",
          )}
        >
          <div className="w-[340px] p-5">
            <p className="mb-2 text-sm font-semibold text-white">
              Select Theme:
            </p>
            <select
              className="mb-5 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
              defaultValue="prebuilt"
            >
              <option value="prebuilt">Pre-built Themes</option>
            </select>

            <div className="grid grid-cols-2 gap-4">
              {FORM_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setThemeId(t.id);
                    // TODO(api): persist theme selection to the form record
                    setThemeApplied(t.id);
                  }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "h-24 w-full rounded-lg border-2",
                      themeId === t.id
                        ? "border-emerald-400"
                        : "border-transparent",
                    )}
                    style={{ background: t.gradient }}
                  />
                  <span className="text-xs text-slate-300">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
