"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Loader2,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Power,
  PowerOff,
  Trash2,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  deleteAutomation,
  disableAutomation,
  duplicateAutomation,
  listAutomations,
  pauseAutomation,
  resumeAutomation,
} from "@/lib/automations/api";
import {
  automationStatusColor,
  TRIGGER_CATALOG,
  type Automation,
  type AutomationTriggerType,
} from "@/lib/automations/types";
import { cn } from "@/lib/utils";

function fmt(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function WorkflowListClient() {
  const router = useRouter();
  const [items, setItems] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const { items } = await listAutomations({ limit: 100 });
      setItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function withBusy(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setOpenMenu(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">Workflows</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage workflows to automate business processes, improve efficiency, and increase
            conversions.
          </p>
        </div>
        <Button onClick={() => router.push("/automations/new")} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Trigger</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Created</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-slate-400">
                  <Workflow className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  No workflows yet. Create your first one to get started.
                </td>
              </tr>
            )}
            {items.map((automation) => {
              const trigger = automation.activeVersion?.triggerType ?? automation.versions?.[0]?.triggerType;
              const triggerMeta = trigger ? TRIGGER_CATALOG[trigger as AutomationTriggerType] : undefined;
              return (
                <tr
                  key={automation.id}
                  className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                  onClick={() => router.push(`/automations/${automation.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{automation.name}</td>
                  <td className="px-4 py-3 text-slate-500">{triggerMeta?.label ?? trigger ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                        automationStatusColor(automation.status)
                      )}
                    >
                      {automation.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmt(automation.updatedAt)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(automation.createdAt)}</td>
                  <td className="relative px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {busy === automation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenMenu(openMenu === automation.id ? null : automation.id)}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    )}
                    {openMenu === automation.id && (
                      <div className="absolute right-4 top-10 z-10 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        {automation.status === "ENABLED" ? (
                          <MenuItem
                            icon={<PowerOff className="h-3.5 w-3.5" />}
                            label="Disable"
                            onClick={() => withBusy(automation.id, () => disableAutomation(automation.id))}
                          />
                        ) : (
                          <MenuItem
                            icon={<Power className="h-3.5 w-3.5" />}
                            label="Enable"
                            onClick={() => router.push(`/automations/${automation.id}`)}
                          />
                        )}
                        {automation.status === "PAUSED" ? (
                          <MenuItem
                            icon={<Play className="h-3.5 w-3.5" />}
                            label="Resume"
                            onClick={() => withBusy(automation.id, () => resumeAutomation(automation.id))}
                          />
                        ) : automation.status === "ENABLED" ? (
                          <MenuItem
                            icon={<Pause className="h-3.5 w-3.5" />}
                            label="Pause"
                            onClick={() => withBusy(automation.id, () => pauseAutomation(automation.id))}
                          />
                        ) : null}
                        <MenuItem
                          icon={<Copy className="h-3.5 w-3.5" />}
                          label="Duplicate"
                          onClick={() => withBusy(automation.id, () => duplicateAutomation(automation.id))}
                        />
                        <MenuItem
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          label="Delete"
                          danger
                          onClick={() => {
                            if (window.confirm(`Delete "${automation.name}"?`)) {
                              void withBusy(automation.id, () => deleteAutomation(automation.id));
                            }
                          }}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50",
        danger ? "text-rose-600" : "text-slate-700"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
