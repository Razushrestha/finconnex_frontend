"use client";

import React, { useState } from "react";
import { Calendar, ChevronDown, FileText, Plus } from "lucide-react";
import {
  type ZohoSendFormSettings,
} from "@/components/documents/signature/create/ZohoStyleSendForm";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPES = [
  "Others",
  "Contract",
  "NDA",
  "Proposal",
  "Agreement",
  "Invoice",
  "HR document",
];

const FOLDERS = ["None", "Sales", "Legal", "HR", "Finance", "Clients"];

const AGREEMENT_VALIDITY = [
  "Forever",
  "30 days after completion",
  "90 days after completion",
  "1 year after completion",
];

const fieldClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";

const selectClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="w-[150px] shrink-0 text-[13px] text-slate-600">
      {children}
    </label>
  );
}

interface AdvancedOptionsProps {
  settings: ZohoSendFormSettings;
  onChangeSettings: (patch: Partial<ZohoSendFormSettings>) => void;
  defaultOpen?: boolean;
}

export const AdvancedOptionsSection: React.FC<AdvancedOptionsProps> = ({
  settings,
  onChangeSettings,
  defaultOpen = true,
}) => {
  const [moreOpen, setMoreOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <button
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        className="flex w-full items-center justify-between py-1 text-left"
        aria-expanded={moreOpen}
      >
        <h3 className="text-[14px] font-semibold text-slate-800">
          More settings
        </h3>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform",
            moreOpen && "rotate-180",
          )}
        />
      </button>

      {moreOpen ? (
        <div className="mt-3 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)]">
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <FormLabel>Days to complete</FormLabel>
              <input
                type="number"
                min={1}
                max={365}
                value={settings.daysToComplete}
                onChange={(e) =>
                  onChangeSettings({
                    daysToComplete: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className={cn(fieldClass, "w-[88px]")}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <FormLabel>Agreement valid until</FormLabel>
              <div className="relative min-w-0 flex-1">
                <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={settings.agreementValidUntil}
                  onChange={(e) =>
                    onChangeSettings({ agreementValidUntil: e.target.value })
                  }
                  className={cn(selectClass, "w-full pl-9")}
                >
                  {AGREEMENT_VALIDITY.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <FormLabel>Document type</FormLabel>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <select
                  value={settings.documentType}
                  onChange={(e) =>
                    onChangeSettings({ documentType: e.target.value })
                  }
                  className={cn(selectClass, "min-w-0 flex-1")}
                >
                  {DOCUMENT_TYPES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 text-primary hover:bg-primary/5"
                  title="Add document type"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <FormLabel>Folder</FormLabel>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <select
                  value={settings.folder}
                  onChange={(e) => onChangeSettings({ folder: e.target.value })}
                  className={cn(selectClass, "min-w-0 flex-1")}
                >
                  {FOLDERS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 text-primary hover:bg-primary/5"
                  title="Add folder"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <FormLabel>Description</FormLabel>
              <div className="relative min-w-0 flex-1">
                <FileText className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={settings.description}
                  onChange={(e) =>
                    onChangeSettings({ description: e.target.value })
                  }
                  placeholder="Add description"
                  className={cn(fieldClass, "pl-9")}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={settings.allowComments}
                onChange={(e) =>
                  onChangeSettings({ allowComments: e.target.checked })
                }
                className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/20"
              />
              Allow recipient comments
            </label>
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={settings.automaticReminders}
                onChange={(e) =>
                  onChangeSettings({
                    automaticReminders: e.target.checked,
                  })
                }
                className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/20"
              />
              Automatic reminders
            </label>
            {settings.automaticReminders ? (
              <>
                <p className="text-[12px] leading-5 text-slate-400">
                  Automatic reminders will only be delivered via email even if
                  the delivery mode is set to &quot;Email + SMS&quot;.
                </p>
                <div className="flex flex-col gap-3 text-[13px] text-slate-600">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Send a reminder every</span>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={settings.reminderEveryDays}
                      onChange={(e) =>
                        onChangeSettings({
                          reminderEveryDays: Math.max(
                            1,
                            Number(e.target.value) || 1,
                          ),
                        })
                      }
                      className={cn(fieldClass, "w-[72px]")}
                      aria-label="Reminder interval in days"
                    />
                    <span>day(s)</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>on</span>
                    <input
                      type="date"
                      value={settings.reminderDay}
                      onChange={(e) =>
                        onChangeSettings({ reminderDay: e.target.value })
                      }
                      className={cn(fieldClass, "w-[168px]")}
                      aria-label="Reminder day"
                    />
                    <span>at</span>
                    <input
                      type="time"
                      value={settings.reminderTime}
                      onChange={(e) =>
                        onChangeSettings({ reminderTime: e.target.value })
                      }
                      className={cn(fieldClass, "w-[128px]")}
                      aria-label="Reminder time"
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export function defaultTemplateMoreSettings(): ZohoSendFormSettings {
  const next = new Date();
  next.setDate(next.getDate() + 5);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return {
    daysToComplete: 15,
    agreementValidUntil: "Forever",
    documentType: "Others",
    folder: "None",
    description: "",
    allowComments: false,
    automaticReminders: true,
    reminderEveryDays: 5,
    reminderDay: `${y}-${m}-${d}`,
    reminderTime: "09:00",
  };
}
