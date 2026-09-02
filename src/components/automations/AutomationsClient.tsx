"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Power,
  PowerOff,
  Copy,
  Trash2,
  History,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react";
import {
  cancelAutomationRun,
  createAutomation,
  deleteAutomation,
  disableAutomation,
  duplicateAutomation,
  enableAutomation,
  listAutomationRuns,
  listAutomations,
  pauseAutomation,
  resumeAutomation,
  retryAutomationRun,
  rollbackAutomationRun,
  triggerAutomation,
} from "@/lib/automations/api";
import {
  AUTOMATION_ACTION_KEYS,
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_ENTITY_TYPES,
  AUTOMATION_FAILURE_POLICIES,
  AUTOMATION_TRIGGER_TYPES,
  automationStatusColor,
  runStatusColor,
  type Automation,
  type AutomationRun,
  type AutomationStep,
} from "@/lib/automations/types";
import { cn } from "@/lib/utils";

function fmt(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Btn({
  onClick,
  disabled,
  children,
  variant = "ghost",
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "ghost" | "primary" | "danger";
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" &&
          "border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
        variant === "danger" &&
          "border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
        variant === "ghost" &&
          "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

function StepEditor({
  steps,
  onChange,
}: {
  steps: AutomationStep[];
  onChange: (steps: AutomationStep[]) => void;
}) {
  function updateStep(index: number, patch: Partial<AutomationStep>) {
    onChange(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function removeStep(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }
  function addStep() {
    onChange([
      ...steps,
      {
        key: `step-${steps.length + 1}-${Date.now().toString(36)}`,
        type: "ACTION",
        action: "CREATE_TASK",
        config: {},
      },
    ]);
  }

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const keys = AUTOMATION_ACTION_KEYS[step.action] ?? { allowed: [], required: [] };
        return (
          <div key={i} className="rounded-lg border border-slate-200 p-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500">
                Step {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="text-slate-400 hover:text-rose-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <select
              value={step.action}
              onChange={(e) => updateStep(i, { action: e.target.value })}
              className="mb-1.5 h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
            >
              {AUTOMATION_ACTION_TYPES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <p className="mb-1 text-[10px] text-slate-400">
              Allowed keys: {keys.allowed.join(", ") || "none"} · Required:{" "}
              {keys.required.join(", ") || "none"}
            </p>
            <textarea
              value={JSON.stringify(step.config, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value || "{}");
                  updateStep(i, { config: parsed });
                } catch {
                  /* keep typing until valid JSON */
                }
              }}
              rows={3}
              className="w-full rounded-md border border-slate-200 p-2 font-mono text-[11px]"
              placeholder='{"subject":"Follow up","assigneeIds":["<uuid>"]}'
            />
          </div>
        );
      })}
      <Btn onClick={addStep}>
        <Plus className="h-3 w-3" /> Add step
      </Btn>
    </div>
  );
}

function CreateAutomationForm({
  onCreated,
  onClose,
}: {
  onCreated: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<string>(AUTOMATION_TRIGGER_TYPES[0]);
  const [entityType, setEntityType] = useState<string>(AUTOMATION_ENTITY_TYPES[0]);
  const [failurePolicy, setFailurePolicy] = useState<string>(AUTOMATION_FAILURE_POLICIES[0]);
  const [steps, setSteps] = useState<AutomationStep[]>([
    { key: "step-1", type: "ACTION", action: "CREATE_TASK", config: {} },
  ]);
  const [triggerConfig, setTriggerConfig] = useState("{}");
  const [conditions, setConditions] = useState("{}");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    let triggerConfigParsed: Record<string, unknown> = {};
    let conditionsParsed: Record<string, unknown> = {};
    try {
      triggerConfigParsed = JSON.parse(triggerConfig || "{}");
      conditionsParsed = JSON.parse(conditions || "{}");
    } catch {
      setError("Trigger config / conditions must be valid JSON");
      return;
    }
    setSaving(true);
    try {
      await createAutomation({
        name: name.trim(),
        description: description.trim() || undefined,
        triggerType: triggerType as never,
        entityType: entityType as never,
        triggerConfig: triggerConfigParsed,
        conditions: conditionsParsed,
        steps,
        failurePolicy: failurePolicy as never,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create automation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-slate-900">New Automation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
              placeholder="Welcome new leads"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Trigger type
              </label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
              >
                {AUTOMATION_TRIGGER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Entity type
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
              >
                {AUTOMATION_ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Failure policy
            </label>
            <select
              value={failurePolicy}
              onChange={(e) => setFailurePolicy(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
            >
              {AUTOMATION_FAILURE_POLICIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Trigger config (JSON, optional)
            </label>
            <textarea
              value={triggerConfig}
              onChange={(e) => setTriggerConfig(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-200 p-2 font-mono text-[11px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Conditions (JSON, optional)
            </label>
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-200 p-2 font-mono text-[11px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Steps
            </label>
            <StepEditor steps={steps} onChange={setSteps} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving} variant="primary">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Create draft
          </Btn>
        </div>
      </div>
    </div>
  );
}

function TriggerModal({
  automationId,
  onClose,
}: {
  automationId: string;
  onClose: () => void;
}) {
  const [entityId, setEntityId] = useState("");
  const [snapshot, setSnapshot] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!entityId.trim()) {
      setError("Entity ID (UUID) is required");
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(snapshot || "{}");
    } catch {
      setError("Snapshot must be valid JSON");
      return;
    }
    setBusy(true);
    try {
      await triggerAutomation(automationId, { entityId: entityId.trim(), snapshot: parsed });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to trigger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-slate-900">Manual trigger</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
            {error}
          </div>
        )}
        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
          Entity ID (UUID)
        </label>
        <input
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          className="mb-2 h-8 w-full rounded-md border border-slate-200 px-2 text-[12px]"
          placeholder="e.g. a lead / contact / deal id"
        />
        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
          Snapshot (JSON)
        </label>
        <textarea
          value={snapshot}
          onChange={(e) => setSnapshot(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-slate-200 p-2 font-mono text-[11px]"
        />
        <div className="mt-3 flex justify-end gap-2">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy} variant="primary">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Trigger
          </Btn>
        </div>
      </div>
    </div>
  );
}

function RunsPanel({ automationId }: { automationId: string }) {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const { items } = await listAutomationRuns(automationId, { limit: 20 });
      setRuns(items);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automationId]);

  async function act(runId: string, fn: (id: string) => Promise<unknown>) {
    setBusyId(runId);
    try {
      await fn(runId);
      await refresh();
    } catch {
      /* surfaced via row staying in previous state */
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-3 text-[11px] text-slate-400">
        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Loading runs…
      </div>
    );
  }
  if (!runs.length) {
    return <div className="p-3 text-[11px] text-slate-400">No runs yet.</div>;
  }

  return (
    <div className="overflow-x-auto p-2">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="text-slate-400">
            <th className="py-1 pr-2 font-medium">Status</th>
            <th className="py-1 pr-2 font-medium">Entity</th>
            <th className="py-1 pr-2 font-medium">Started</th>
            <th className="py-1 pr-2 font-medium">Completed</th>
            <th className="py-1 pr-2 font-medium">Error</th>
            <th className="py-1 pr-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-t border-slate-100">
              <td className="py-1.5 pr-2">
                <Badge className={runStatusColor(run.status)}>{run.status}</Badge>
              </td>
              <td className="py-1.5 pr-2 text-slate-600">
                {run.triggerEntityType} · {run.triggerEntityId.slice(0, 8)}
              </td>
              <td className="py-1.5 pr-2 text-slate-500">{fmt(run.startedAt)}</td>
              <td className="py-1.5 pr-2 text-slate-500">{fmt(run.completedAt)}</td>
              <td className="py-1.5 pr-2 text-rose-600">{run.errorCategory ?? "—"}</td>
              <td className="py-1.5 pr-2">
                <div className="flex gap-1">
                  {(run.status === "FAILED" || run.status === "MANUAL_INTERVENTION_REQUIRED") && (
                    <Btn
                      onClick={() => act(run.id, retryAutomationRun)}
                      disabled={busyId === run.id}
                      title="Retry"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Btn>
                  )}
                  {(run.status === "QUEUED" || run.status === "RUNNING" || run.status === "WAITING") && (
                    <Btn
                      onClick={() => act(run.id, cancelAutomationRun)}
                      disabled={busyId === run.id}
                      variant="danger"
                      title="Cancel"
                    >
                      <X className="h-3 w-3" />
                    </Btn>
                  )}
                  {run.status === "FAILED" && (
                    <Btn
                      onClick={() => act(run.id, rollbackAutomationRun)}
                      disabled={busyId === run.id}
                      title="Rollback"
                    >
                      <History className="h-3 w-3" />
                    </Btn>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AutomationsClient() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [triggerFor, setTriggerFor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const { items } = await listAutomations({ limit: 50 });
      setAutomations(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load automations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function act(id: string, fn: (id: string) => Promise<unknown>) {
    setBusyId(id);
    try {
      await fn(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this automation?")) return;
    await act(id, deleteAutomation);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div className="relative mx-auto max-w-[1200px] p-2.5 sm:p-3 lg:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-600" />
            <h1 className="text-[17px] font-bold tracking-tight text-slate-900">
              Automations
            </h1>
          </div>
          <div className="flex gap-2">
            <Btn onClick={refresh}>
              <RefreshCw className="h-3 w-3" /> Refresh
            </Btn>
            <Btn onClick={() => setShowCreate(true)} variant="primary">
              <Plus className="h-3 w-3" /> New automation
            </Btn>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-6 text-center text-[12px] text-slate-400">
              <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : !automations.length ? (
            <div className="p-6 text-center text-[12px] text-slate-400">
              No automations yet. Create one to get started.
            </div>
          ) : (
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Trigger</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {automations.map((a) => {
                  const trigger = a.activeVersion?.triggerType ?? a.versions?.[0]?.triggerType ?? "—";
                  const isManual = trigger === "MANUAL";
                  const busy = busyId === a.id;
                  return (
                    <Fragment key={a.id}>
                      <tr className="border-b border-slate-50 hover:bg-slate-50/60">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-800">{a.name}</div>
                          {a.description && (
                            <div className="text-[10px] text-slate-400">{a.description}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{String(trigger)}</td>
                        <td className="px-3 py-2">
                          <Badge className={automationStatusColor(String(a.status))}>
                            {a.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-slate-500">{fmt(a.updatedAt)}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {a.status === "DRAFT" || a.status === "DISABLED" ? (
                              <Btn onClick={() => act(a.id, enableAutomation)} disabled={busy} title="Enable">
                                <Power className="h-3 w-3" />
                              </Btn>
                            ) : null}
                            {a.status === "ENABLED" ? (
                              <>
                                <Btn onClick={() => act(a.id, pauseAutomation)} disabled={busy} title="Pause">
                                  <Pause className="h-3 w-3" />
                                </Btn>
                                <Btn onClick={() => act(a.id, disableAutomation)} disabled={busy} title="Disable">
                                  <PowerOff className="h-3 w-3" />
                                </Btn>
                              </>
                            ) : null}
                            {a.status === "PAUSED" ? (
                              <Btn onClick={() => act(a.id, resumeAutomation)} disabled={busy} title="Resume">
                                <Play className="h-3 w-3" />
                              </Btn>
                            ) : null}
                            {isManual && a.status === "ENABLED" ? (
                              <Btn onClick={() => setTriggerFor(a.id)} title="Trigger manually">
                                <Zap className="h-3 w-3" />
                              </Btn>
                            ) : null}
                            <Btn
                              onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                              title="View runs"
                            >
                              <History className="h-3 w-3" />
                            </Btn>
                            <Btn onClick={() => act(a.id, duplicateAutomation)} disabled={busy} title="Duplicate">
                              <Copy className="h-3 w-3" />
                            </Btn>
                            <Btn onClick={() => remove(a.id)} disabled={busy} variant="danger" title="Delete">
                              <Trash2 className="h-3 w-3" />
                            </Btn>
                          </div>
                        </td>
                      </tr>
                      {expandedId === a.id && (
                        <tr>
                          <td colSpan={5} className="bg-slate-50/60 px-3">
                            <RunsPanel automationId={a.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateAutomationForm onCreated={refresh} onClose={() => setShowCreate(false)} />
      )}
      {triggerFor && (
        <TriggerModal automationId={triggerFor} onClose={() => setTriggerFor(null)} />
      )}
    </div>
  );
}
