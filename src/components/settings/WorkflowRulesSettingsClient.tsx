"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import {
  createCrmWorkflowRule,
  deleteCrmWorkflowRule,
  persistRemoteWorkflowRule,
  suggestCrmWorkflowRule,
  updateCrmWorkflowRule,
} from "@/lib/workflow-rules/api";
import { useCrmWorkflowRules } from "@/lib/workflow-rules/use-crm-workflow-rules";
import {
  WORKFLOW_RULE_STATUS_STYLE,
  WORKFLOW_RULE_TRIGGERS,
  deleteWorkflowRule,
  formatWorkflowRuleAt,
  listWorkflowRules,
  nextWorkflowRuleIds,
  upsertWorkflowRule,
  type WorkflowRule,
  type WorkflowRuleTrigger,
} from "@/lib/workflow-rules/types";
import { cn } from "@/lib/utils";

const emptyDraft = {
  name: "",
  description: "",
  trigger: "Lead Created" as WorkflowRuleTrigger,
  conditions: "",
  actions: "",
  enabled: true,
};

export function WorkflowRulesSettingsClient() {
  const crm = useCrmWorkflowRules();
  const [rows, setRows] = useState<WorkflowRule[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [suggestText, setSuggestText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function reload() {
    setRows(listWorkflowRules());
  }

  useEffect(() => {
    reload();
  }, [crm.source, crm.loading]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.ruleId.toLowerCase().includes(q) ||
        row.trigger.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q),
    );
  }, [rows, search]);

  async function onCreate() {
    if (!draft.name.trim()) {
      flash("Name is required");
      return;
    }
    setBusy(true);
    try {
      const remote = persistRemoteWorkflowRule(
        await createCrmWorkflowRule({
          name: draft.name.trim(),
          description: draft.description.trim(),
          trigger: draft.trigger,
          conditions: draft.conditions.trim(),
          actions: draft.actions.trim(),
          enabled: draft.enabled,
          status: draft.enabled ? "Active" : "Draft",
        }),
      );
      if (!remote) {
        const ids = nextWorkflowRuleIds();
        upsertWorkflowRule({
          ...ids,
          name: draft.name.trim(),
          description: draft.description.trim(),
          trigger: draft.trigger,
          conditions: draft.conditions.trim(),
          actions: draft.actions.trim(),
          enabled: draft.enabled,
          status: draft.enabled ? "Active" : "Draft",
          createdBy: "You",
          createdAt: formatWorkflowRuleAt(),
          updatedAt: formatWorkflowRuleAt(),
        });
      }
      setDraft(emptyDraft);
      reload();
      crm.refresh();
      flash(remote ? "Rule created in CRM" : "Rule saved locally");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSuggest() {
    if (!suggestText.trim()) {
      flash("Describe the rule first");
      return;
    }
    setBusy(true);
    try {
      const suggested = await suggestCrmWorkflowRule(suggestText.trim());
      if (!suggested) {
        flash("No suggestion returned");
        return;
      }
      setDraft({
        name: suggested.name,
        description: suggested.description || suggestText.trim(),
        trigger: suggested.trigger,
        conditions: suggested.conditions,
        actions: suggested.actions,
        enabled: suggested.enabled,
      });
      flash("Suggestion applied — review and create");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Suggest failed");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(row: WorkflowRule) {
    const next = {
      ...row,
      enabled: !row.enabled,
      status: (!row.enabled ? "Active" : "Disabled") as WorkflowRule["status"],
      updatedAt: formatWorkflowRuleAt(),
    };
    setBusy(true);
    try {
      const remote = persistRemoteWorkflowRule(
        await updateCrmWorkflowRule(row.id, {
          enabled: next.enabled,
          status: next.status,
        }),
      );
      upsertWorkflowRule(remote ?? next);
      reload();
      flash(next.enabled ? "Rule enabled" : "Rule disabled");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(row: WorkflowRule) {
    setBusy(true);
    try {
      const remote = persistRemoteWorkflowRule(
        await updateCrmWorkflowRule(row.id, row),
      );
      upsertWorkflowRule(
        remote ?? { ...row, updatedAt: formatWorkflowRuleAt() },
      );
      setEditingId(null);
      reload();
      flash("Rule updated");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: WorkflowRule) {
    if (!window.confirm(`Soft-delete “${row.name}”?`)) return;
    setBusy(true);
    try {
      try {
        await deleteCrmWorkflowRule(row.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (!/sign in/i.test(message) && crm.source === "api") throw err;
      }
      deleteWorkflowRule(row.id);
      reload();
      flash("Rule deleted");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-bold text-slate-900">
                  Workflow rules
                </h2>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    crm.source === "api"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {crm.source === "api"
                    ? "Live CRM"
                    : crm.loading
                      ? "Connecting…"
                      : "Demo"}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-slate-500">
                List, create, update, and soft-delete rules. Journeys sit on top
                of this engine —{" "}
                <Link href="/journeys" className="font-semibold text-violet-600">
                  open Journeys
                </Link>
                .
              </p>
              {crm.error && crm.source !== "api" ? (
                <p className="mt-1 text-[11px] text-amber-700">{crm.error}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => crm.refresh()}
              className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-3 border-b border-slate-100 px-5 py-4">
          <p className="text-[11px] font-semibold text-slate-600">
            Suggest from a description
          </p>
          <div className="flex flex-wrap gap-2">
            <textarea
              value={suggestText}
              onChange={(e) => setSuggestText(e.target.value)}
              rows={2}
              placeholder="When a lead is created from the website, assign John and send a welcome email…"
              className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[12px]"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSuggest()}
              className="inline-flex h-9 items-center gap-1 self-start rounded-lg border border-violet-200 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Suggest
            </button>
          </div>
        </div>

        <div className="grid gap-2 border-b border-slate-100 px-5 py-4 sm:grid-cols-2">
          <label className="text-[11px] font-semibold text-slate-600">
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 text-[12px] font-normal"
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-600">
            Trigger
            <select
              value={draft.trigger}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  trigger: e.target.value as WorkflowRuleTrigger,
                }))
              }
              className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 text-[12px] font-normal"
            >
              {WORKFLOW_RULE_TRIGGERS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-600 sm:col-span-2">
            Description
            <input
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => ({ ...d, description: e.target.value }))
              }
              className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 text-[12px] font-normal"
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-600">
            Conditions
            <input
              value={draft.conditions}
              onChange={(e) =>
                setDraft((d) => ({ ...d, conditions: e.target.value }))
              }
              className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 text-[12px] font-normal"
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-600">
            Actions
            <input
              value={draft.actions}
              onChange={(e) =>
                setDraft((d) => ({ ...d, actions: e.target.value }))
              }
              className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 text-[12px] font-normal"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, enabled: e.target.checked }))
                }
              />
              Enabled
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onCreate()}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Create rule
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules…"
            className="h-8 flex-1 rounded-lg border border-slate-200 px-2.5 text-[12px]"
          />
          <span className="text-[11px] text-slate-400">
            {filtered.length} of {rows.length}
          </span>
        </div>

        <ul className="divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <li className="px-5 py-10 text-center text-[12px] text-slate-400">
              No workflow rules.
            </li>
          ) : (
            filtered.map((row) => {
              const editing = editingId === row.id;
              return (
                <li key={row.id} className="px-5 py-3">
                  {editing ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={row.name}
                        onChange={(e) =>
                          setRows((list) =>
                            list.map((r) =>
                              r.id === row.id
                                ? { ...r, name: e.target.value }
                                : r,
                            ),
                          )
                        }
                        className="h-8 rounded-lg border border-slate-200 px-2 text-[12px]"
                      />
                      <select
                        value={row.trigger}
                        onChange={(e) =>
                          setRows((list) =>
                            list.map((r) =>
                              r.id === row.id
                                ? {
                                    ...r,
                                    trigger: e.target
                                      .value as WorkflowRuleTrigger,
                                  }
                                : r,
                            ),
                          )
                        }
                        className="h-8 rounded-lg border border-slate-200 px-2 text-[12px]"
                      >
                        {WORKFLOW_RULE_TRIGGERS.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <input
                        value={row.conditions}
                        onChange={(e) =>
                          setRows((list) =>
                            list.map((r) =>
                              r.id === row.id
                                ? { ...r, conditions: e.target.value }
                                : r,
                            ),
                          )
                        }
                        className="h-8 rounded-lg border border-slate-200 px-2 text-[12px] sm:col-span-2"
                      />
                      <input
                        value={row.actions}
                        onChange={(e) =>
                          setRows((list) =>
                            list.map((r) =>
                              r.id === row.id
                                ? { ...r, actions: e.target.value }
                                : r,
                            ),
                          )
                        }
                        className="h-8 rounded-lg border border-slate-200 px-2 text-[12px] sm:col-span-2"
                      />
                      <div className="flex gap-2 sm:col-span-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onSaveEdit(row)}
                          className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            reload();
                          }}
                          className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[13px] font-semibold text-slate-800">
                            {row.name}
                          </p>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                              WORKFLOW_RULE_STATUS_STYLE[row.status],
                            )}
                          >
                            {row.status}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {row.ruleId}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {row.trigger}
                          {row.conditions ? ` · ${row.conditions}` : ""}
                        </p>
                        {row.actions ? (
                          <p className="text-[11px] text-slate-500">
                            {row.actions}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onToggle(row)}
                          className="h-7 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-600"
                        >
                          {row.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(row.id)}
                          className="h-7 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDelete(row)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-rose-200 px-2 text-[10px] font-semibold text-rose-700"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
      {toast ? (
        <p className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white">
          {toast}
        </p>
      ) : null}
    </div>
  );
}
