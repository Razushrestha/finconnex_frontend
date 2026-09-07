"use client";

import { useEffect, useState } from "react";
import { getTicketSlaConfig, putTicketSlaConfig } from "@/lib/ticket-sla/api";
import {
  DEFAULT_TICKET_SLA_CONFIG,
  TICKET_PRIORITY_CODES,
  WEEKDAYS,
  type TicketPriorityCode,
  type TicketSlaConfig,
  type Weekday,
} from "@/lib/ticket-sla/types";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<TicketPriorityCode, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const PRIORITY_STYLE: Record<TicketPriorityCode, string> = {
  CRITICAL: "bg-rose-50 text-rose-700",
  HIGH: "bg-amber-50 text-amber-700",
  MEDIUM: "bg-sky-50 text-sky-700",
  LOW: "bg-slate-100 text-slate-600",
};

function cloneConfig(config: TicketSlaConfig): TicketSlaConfig {
  return JSON.parse(JSON.stringify(config)) as TicketSlaConfig;
}

export function TicketSlaSettingsClient() {
  const [config, setConfig] = useState<TicketSlaConfig>(() =>
    cloneConfig(DEFAULT_TICKET_SLA_CONFIG),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const remote = await getTicketSlaConfig();
      setConfig(remote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SLA config");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updatePriority(
    priority: TicketPriorityCode,
    field: "responseMinutes" | "resolutionMinutes",
    raw: string,
  ) {
    const value = raw.trim() === "" ? null : Math.max(1, Number(raw));
    setConfig((prev) => ({
      ...prev,
      prioritySlas: {
        ...prev.prioritySlas,
        [priority]: { ...prev.prioritySlas[priority], [field]: value },
      },
    }));
  }

  function updateDay(day: Weekday, field: "enabled" | "start" | "end", value: boolean | string) {
    setConfig((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        days: {
          ...prev.businessHours.days,
          [day]: { ...prev.businessHours.days[day], [field]: value },
        },
      },
    }));
  }

  function addHoliday(dateStr: string) {
    if (!dateStr || config.holidays.includes(dateStr)) return;
    setConfig((prev) => ({
      ...prev,
      holidays: [...prev.holidays, dateStr].sort(),
    }));
  }

  function removeHoliday(dateStr: string) {
    setConfig((prev) => ({
      ...prev,
      holidays: prev.holidays.filter((h) => h !== dateStr),
    }));
  }

  async function save() {
    setBusy(true);
    try {
      const saved = await putTicketSlaConfig(config);
      setConfig(saved);
      flash("SLA configuration saved");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function resetDefaults() {
    setConfig(cloneConfig(DEFAULT_TICKET_SLA_CONFIG));
    flash("Reset to defaults (not yet saved)");
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">
              Ticket SLA rules
            </h2>
            <p className="mt-0.5 max-w-xl text-[12px] text-slate-500">
              Response and resolution deadlines per priority. A background
              scan warns the assignee ahead of a breach, escalates to
              workspace owners/admins once breached, and can auto-close
              resolved tickets after a waiting period.
            </p>
            {error ? (
              <p className="mt-1 text-[11px] text-rose-600">{error}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-[12px] text-slate-400">
            Loading…
          </div>
        ) : (
          <div className="space-y-5 px-5 py-4">
            <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.isActive}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, isActive: e.target.checked }))
                }
              />
              SLA timers active
            </label>
            <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.showBadgesOnCards}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    showBadgesOnCards: e.target.checked,
                  }))
                }
              />
              Show SLA badges on ticket cards
            </label>

            <div>
              <p className="mb-2 text-[11px] font-semibold text-slate-600">
                Priority targets (minutes)
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Priority</th>
                      <th className="px-3 py-2 text-left">Response</th>
                      <th className="px-3 py-2 text-left">Resolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {TICKET_PRIORITY_CODES.map((priority) => (
                      <tr key={priority}>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              PRIORITY_STYLE[priority],
                            )}
                          >
                            {PRIORITY_LABEL[priority]}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={config.prioritySlas[priority].responseMinutes ?? ""}
                            onChange={(e) =>
                              updatePriority(priority, "responseMinutes", e.target.value)
                            }
                            placeholder="No SLA"
                            className="w-28 rounded-lg border border-slate-200 px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={config.prioritySlas[priority].resolutionMinutes ?? ""}
                            onChange={(e) =>
                              updatePriority(priority, "resolutionMinutes", e.target.value)
                            }
                            placeholder="No SLA"
                            className="w-28 rounded-lg border border-slate-200 px-2 py-1"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-600">
                  Warn before breach (minutes)
                </span>
                <input
                  type="number"
                  min={1}
                  value={config.warnBeforeBreachMinutes}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      warnBeforeBreachMinutes: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-600">
                  Auto-close after resolved (minutes, blank = disabled)
                </span>
                <input
                  type="number"
                  min={1}
                  value={config.autoCloseAfterResolvedMinutes ?? ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      autoCloseAfterResolvedMinutes:
                        e.target.value.trim() === ""
                          ? null
                          : Math.max(1, Number(e.target.value)),
                    }))
                  }
                  placeholder="Disabled"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={config.useBusinessHours}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      useBusinessHours: e.target.checked,
                    }))
                  }
                />
                Only count business hours toward deadlines
              </label>

              {config.useBusinessHours ? (
                <div className="mt-3 space-y-3 rounded-lg border border-slate-200 p-3">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-slate-600">
                      Timezone (IANA, e.g. Australia/Sydney)
                    </span>
                    <input
                      value={config.businessHours.timezone}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          businessHours: {
                            ...prev.businessHours,
                            timezone: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
                    />
                  </label>
                  <div className="space-y-1.5">
                    {WEEKDAYS.map(({ code, label }) => {
                      const day = config.businessHours.days[code];
                      return (
                        <div key={code} className="flex items-center gap-2 text-[12px]">
                          <label className="flex w-20 items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={day.enabled}
                              onChange={(e) => updateDay(code, "enabled", e.target.checked)}
                            />
                            {label}
                          </label>
                          <input
                            type="time"
                            value={day.start}
                            disabled={!day.enabled}
                            onChange={(e) => updateDay(code, "start", e.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40"
                          />
                          <span className="text-slate-400">to</span>
                          <input
                            type="time"
                            value={day.end}
                            disabled={!day.enabled}
                            onChange={(e) => updateDay(code, "end", e.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-600">
                      Holidays (fully excluded)
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        onChange={(e) => {
                          addHoliday(e.target.value);
                          e.target.value = "";
                        }}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[12px]"
                      />
                      {config.holidays.map((h) => (
                        <span
                          key={h}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                        >
                          {h}
                          <button
                            type="button"
                            onClick={() => removeHoliday(h)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="h-9 rounded-lg bg-violet-600 px-4 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={resetDefaults}
                className="h-9 rounded-lg border border-slate-200 px-4 text-[12px] font-semibold text-slate-700"
              >
                Reset defaults
              </button>
            </div>
          </div>
        )}
      </div>

      {toast ? (
        <div className="fixed right-4 bottom-4 rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
