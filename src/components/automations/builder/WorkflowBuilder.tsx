"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ChevronLeft, Loader2, Play, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  createAutomation,
  disableAutomation,
  dryRunAutomation,
  enableAutomation,
  getAutomation,
  publishAutomationVersion,
  updateAutomationDraft,
} from "@/lib/automations/api";
import {
  buildWorkflowGraph,
  type BuilderNode,
  type TriggerView,
} from "@/lib/automations/layout";
import {
  generateStepKey,
  getStepAtPath,
  insertStepAtPath,
  removeStepAtPath,
  updateStepAtPath,
} from "@/lib/automations/step-tree";
import {
  TRIGGER_CATALOG,
  type Automation,
  type AutomationActionType,
  type AutomationConditionGroup,
  type AutomationEntityType,
  type AutomationStep,
  type AutomationTriggerStats,
  type AutomationTriggerType,
} from "@/lib/automations/types";
import {
  describeAutomationRecord,
  type AutomationRecordOption,
} from "@/lib/automations/record-search";
import {
  changedFieldMeta,
  describeChangedFields,
  describeTransition,
  describeTriggerScope,
  scopeRecordIds,
  readTriggerFilter,
  transitionMeta,
  type TransitionOption,
} from "@/lib/automations/trigger-scope";
import { loadAssignableOwners } from "@/lib/users/assignable";

import {
  ActionNode,
  AddStepNode,
  AddTriggerNode,
  BranchLabelNode,
  EndNode,
  IfElseNode,
  TriggerNode,
  WaitNode,
} from "./nodes/WorkflowNodes";
import { ActionPickerPanel, TriggerPickerPanel } from "./StepPickerPanel";
import { StepConfigPanel } from "./StepConfigPanel";
import { TriggerStatsPanel } from "./TriggerStatsPanel";
import { TriggerConfigPanel } from "./TriggerConfigPanel";

const nodeTypes = {
  trigger: TriggerNode,
  addTrigger: AddTriggerNode,
  action: ActionNode,
  wait: WaitNode,
  ifElse: IfElseNode,
  branchLabel: BranchLabelNode,
  addStep: AddStepNode,
  end: EndNode,
};

type PanelState =
  | { mode: "pick-trigger"; index: number }
  | { mode: "configure-trigger"; index: number }
  | { mode: "trigger-stats"; index: number }
  | { mode: "pick-action"; insertPath: string }
  | { mode: "configure"; path: string };

/**
 * One trigger as the builder edits it. `type` is null only for the empty
 * card a new workflow opens with; saving requires every trigger to name one.
 *
 * Record scope lives in each trigger's own `conditions` rather than the
 * definition-wide group: with several entry points, "any lead" for one of
 * them says nothing about the others.
 */
type BuilderTrigger = {
  key: string;
  type: AutomationTriggerType | null;
  entityType: AutomationEntityType;
  config: Record<string, unknown>;
  conditions?: AutomationConditionGroup;
};

let triggerKeySeq = 0;
function newTriggerKey(): string {
  triggerKeySeq += 1;
  return `trg-${Date.now().toString(36)}-${triggerKeySeq}`;
}

function blankTrigger(): BuilderTrigger {
  return { key: newTriggerKey(), type: null, entityType: "LEAD", config: {} };
}

/**
 * The card caption: what this trigger is narrowed to, so the canvas shows
 * each entry point's filters without opening its panel.
 */
function summarizeTrigger(
  trigger: BuilderTrigger,
  owners: TransitionOption[],
  recordLabels: Record<string, string>
): string | undefined {
  if (!trigger.type) return undefined;
  const transition = transitionMeta(trigger.type);
  const changedFields = changedFieldMeta(trigger.type);
  const filter = readTriggerFilter(trigger.conditions, transition?.fields ?? null);
  const pinned = scopeRecordIds(filter.scope);
  const label =
    pinned.length === 1
      ? (recordLabels[`${trigger.entityType}:${pinned[0]}`] ?? null)
      : null;
  const scopeText = describeTriggerScope(filter.scope, trigger.entityType, label);
  const detail = transition
    ? describeTransition(filter.transition, transition, transition.options ?? owners)
    : changedFields
      ? describeChangedFields(filter.changedFields, changedFields)
      : null;
  return detail ? `${scopeText} · ${detail}` : scopeText;
}

/** The lone record a trigger is pinned to, if it is pinned to exactly one. */
function pinnedRecordOf(
  trigger: BuilderTrigger
): { entityType: AutomationEntityType; id: string } | null {
  if (!trigger.type) return null;
  const transition = transitionMeta(trigger.type);
  const filter = readTriggerFilter(trigger.conditions, transition?.fields ?? null);
  const ids = scopeRecordIds(filter.scope);
  return ids.length === 1 ? { entityType: trigger.entityType, id: ids[0] } : null;
}

function newDefaultStep(
  kind: AutomationActionType | "WAIT_FOR_DURATION" | "WAIT_UNTIL_DATE" | "IF_ELSE"
): AutomationStep {
  if (kind === "WAIT_FOR_DURATION") {
    return { key: generateStepKey("wait"), type: "WAIT_FOR_DURATION", durationMs: 86_400_000 };
  }
  if (kind === "WAIT_UNTIL_DATE") {
    return {
      key: generateStepKey("wait"),
      type: "WAIT_UNTIL_DATE",
      until: new Date(Date.now() + 86_400_000).toISOString(),
    };
  }
  if (kind === "IF_ELSE") {
    return {
      key: generateStepKey("branch"),
      type: "IF_ELSE",
      condition: { mode: "ALL", items: [] },
      then: [],
      else: [],
    };
  }
  return {
    key: generateStepKey("action"),
    type: "ACTION",
    action: kind,
    config: {},
  };
}

function BuilderInner({ id, folderId: initialFolderId }: { id: string; folderId: string | null }) {
  const router = useRouter();
  const isNew = id === "new";
  /** Where the workflow is filed: set from the URL for a new one, then from the saved record. */
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);

  const [automationId, setAutomationId] = useState<string | null>(isNew ? null : id);
  const [name, setName] = useState("Untitled Workflow");
  /**
   * The workflow's entry points. It fires when ANY of them matches, so these
   * are siblings, not a sequence — the canvas draws them as a row that
   * converges into the shared step column.
   */
  const [triggers, setTriggers] = useState<BuilderTrigger[]>(() => [blankTrigger()]);
  /** Run counts per trigger key, as the detail endpoint reports them. */
  const [triggerStats, setTriggerStats] = useState<Record<string, AutomationTriggerStats>>({});
  /** Resolved names for pinned records, keyed `entityType:id`, for the captions. */
  const [recordLabels, setRecordLabels] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [status, setStatus] = useState<Automation["status"]>("DRAFT");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState | null>(null);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    getAutomation(id)
      .then((automation) => {
        if (cancelled) return;
        const latest = automation.versions?.[0];
        const definition = latest?.definition;
        setName(automation.name);
        setStatus(automation.status);
        setFolderId(automation.folderId ?? null);
        setSteps((definition?.steps as AutomationStep[]) ?? []);

        const saved = definition?.triggers;
        if (saved?.length) {
          setTriggers(
            saved.map((trigger, index) => ({
              key: trigger.key || `trigger-${index + 1}`,
              type: trigger.type as AutomationTriggerType,
              entityType: trigger.entityType as AutomationEntityType,
              config: trigger.config ?? {},
              conditions: trigger.conditions ?? undefined,
            }))
          );
        } else if (definition?.trigger?.type) {
          // Saved before multi-trigger: its scope lived in the definition's
          // top-level conditions, which is now the trigger's own. Folding it
          // in here means the next save writes the current shape without
          // changing what the workflow matches.
          setTriggers([
            {
              key: "trigger-1",
              type: definition.trigger.type as AutomationTriggerType,
              entityType: (definition.trigger.entityType as AutomationEntityType) ?? "LEAD",
              config: definition.trigger.config ?? {},
              conditions: definition.conditions ?? undefined,
            },
          ]);
        }

        setTriggerStats(
          Object.fromEntries(
            (automation.triggers ?? [])
              .filter((trigger) => trigger.stats)
              .map((trigger) => [trigger.key, trigger.stats as AutomationTriggerStats])
          )
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  /**
   * Owner-backed transitions store user ids. The canvas caption has to render
   * names, so the same list the panels offer is loaded here too — a bare uuid
   * on a card would be unreadable.
   */
  const [owners, setOwners] = useState<TransitionOption[]>([]);
  const ownerBacked = triggers.some(
    (trigger) => transitionMeta(trigger.type)?.source === "owners"
  );
  useEffect(() => {
    if (!ownerBacked) return;
    let cancelled = false;
    loadAssignableOwners().then((rows) => {
      if (cancelled) return;
      setOwners(rows.map((row) => ({ label: row.name || row.email, value: row.id })));
    });
    return () => {
      cancelled = true;
    };
  }, [ownerBacked]);

  /**
   * Resolve every pinned record id to a name for the captions. Keyed by
   * `entityType:id` and only ever added to, so a card that goes back to "any
   * record" costs no refetch if it is pinned again.
   */
  const pinnedKey = triggers
    .map((trigger) => {
      const pinned = pinnedRecordOf(trigger);
      return pinned ? `${pinned.entityType}:${pinned.id}` : "";
    })
    .join("|");
  useEffect(() => {
    let cancelled = false;
    const missing = triggers
      .map(pinnedRecordOf)
      .filter(
        (pinned): pinned is { entityType: AutomationEntityType; id: string } =>
          pinned !== null && !(`${pinned.entityType}:${pinned.id}` in recordLabels)
      );
    if (!missing.length) return;
    Promise.all(
      missing.map((pinned) =>
        describeAutomationRecord(pinned.entityType, pinned.id).then(
          (option) => [pinned, option] as const
        )
      )
    ).then((resolved) => {
      if (cancelled) return;
      const found = resolved.filter(([, option]) => option);
      if (!found.length) return;
      setRecordLabels((prev) => ({
        ...prev,
        ...Object.fromEntries(
          found.map(([pinned, option]) => [
            `${pinned.entityType}:${pinned.id}`,
            (option as AutomationRecordOption).label,
          ])
        ),
      }));
    });
    return () => {
      cancelled = true;
    };
    // `pinnedKey` stands in for the pinned ids so an unrelated trigger edit
    // does not re-run the lookups.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedKey, recordLabels]);

  /** Entity types the steps below have to be valid for — one per trigger. */
  const entityTypes = useMemo(
    () => [...new Set(triggers.map((trigger) => trigger.entityType))],
    [triggers]
  );
  /** The trigger whose fields the step panels edit against. */
  const primaryEntityType = entityTypes[0] ?? "LEAD";

  const triggerViews = useMemo<TriggerView[]>(
    () =>
      triggers.map((trigger) => ({
        key: trigger.key,
        triggerType: trigger.type,
        scopeSummary: summarizeTrigger(trigger, owners, recordLabels),
        stats: triggerStats[trigger.key],
      })),
    [triggers, owners, recordLabels, triggerStats]
  );

  const graph = useMemo(
    () => buildWorkflowGraph(triggerViews, steps),
    [triggerViews, steps]
  );

  const selectedPath =
    panel?.mode === "configure"
      ? panel.path
      : panel?.mode === "pick-trigger" ||
          panel?.mode === "configure-trigger" ||
          panel?.mode === "trigger-stats"
        ? `trigger:${panel.index}`
        : null;

  /**
   * Clicking a trigger card goes straight to its configuration once a trigger
   * is chosen — "Change trigger" in that panel is the way back to the list,
   * so re-picking is deliberate instead of the only thing a click does.
   */
  const onSelectTrigger = useCallback(
    (index: number) =>
      setPanel(
        triggers[index]?.type
          ? { mode: "configure-trigger", index }
          : { mode: "pick-trigger", index }
      ),
    [triggers]
  );
  const onAddTrigger = useCallback(() => {
    setTriggers((prev) => [...prev, blankTrigger()]);
    setPanel({ mode: "pick-trigger", index: triggers.length });
  }, [triggers.length]);
  const onDuplicateTrigger = useCallback((index: number) => {
    setTriggers((prev) => {
      const source = prev[index];
      if (!source) return prev;
      const copy: BuilderTrigger = { ...source, key: newTriggerKey() };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  }, []);
  const onDeleteTrigger = useCallback((index: number) => {
    // Never drop the last one: a workflow with no trigger cannot start, and
    // the backend refuses it as `triggersRequired`.
    setTriggers((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    setPanel(null);
  }, []);
  const onShowTriggerStats = useCallback(
    (index: number) => setPanel({ mode: "trigger-stats", index }),
    []
  );
  const onSelectStep = useCallback((path: string) => setPanel({ mode: "configure", path }), []);
  const onDeleteStep = useCallback((path: string) => {
    setSteps((prev) => removeStepAtPath(prev, path));
    setPanel(null);
  }, []);
  const onAddAt = useCallback((path: string) => setPanel({ mode: "pick-action", insertPath: path }), []);

  const nodes: BuilderNode[] = useMemo(
    () =>
      graph.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          interactions: {
            onSelectTrigger,
            onAddTrigger,
            onDuplicateTrigger,
            onDeleteTrigger,
            onShowTriggerStats,
            onSelectStep,
            onDeleteStep,
            onAddAt,
            selectedPath,
          },
        },
      })),
    [
      graph.nodes,
      onSelectTrigger,
      onAddTrigger,
      onDuplicateTrigger,
      onDeleteTrigger,
      onShowTriggerStats,
      onSelectStep,
      onDeleteStep,
      onAddAt,
      selectedPath,
    ]
  );

  function buildPayload() {
    return {
      name,
      triggers: triggers.map((trigger) => ({
        key: trigger.key,
        type: trigger.type as AutomationTriggerType,
        entityType: trigger.entityType,
        config: trigger.config,
        // Explicitly null, never undefined: the backend keeps a stored group
        // when the key is absent, so an omitted one would silently restore
        // the old scope after the user switched back to "any record".
        conditions: trigger.conditions ?? null,
      })),
      // Scope now lives on each trigger, so the definition-wide group — where
      // a single-trigger workflow used to keep it — is cleared on save.
      conditions: null,
      steps,
      failurePolicy: "STOP_ON_FAILURE" as const,
    };
  }

  /** Publish the newest version and switch the workflow live. */
  async function publishLatestVersion(savedId: string) {
    const automation = await getAutomation(savedId);
    const latest = automation.versions?.[0];
    if (!latest) throw new Error("No version to publish");
    await publishAutomationVersion(savedId, latest.id);
    await enableAutomation(savedId);
    setStatus("ENABLED");
  }

  /**
   * `republish` keeps a live workflow live across an edit.
   *
   * PATCHing an ENABLED automation deliberately demotes it to DISABLED
   * server-side: the edit creates an unpublished version, so the old one must
   * stop running. Without republishing, pressing Save on a published workflow
   * silently flipped the toggle back to Draft and took it offline. The toggle
   * is the publish control, so saving while it reads Published has to leave it
   * published. `handleTogglePublish` opts out — it publishes explicitly, and
   * needs Save not to fight the direction it is switching to.
   */
  async function handleSave(
    { republish = true }: { republish?: boolean } = {},
  ): Promise<string | null> {
    const unset = triggers.findIndex((trigger) => !trigger.type);
    if (unset !== -1) {
      window.alert(
        triggers.length === 1
          ? "Choose a trigger before saving."
          : `Trigger ${unset + 1} has no type yet — choose one or remove it before saving.`
      );
      setPanel({ mode: "pick-trigger", index: unset });
      return null;
    }
    setSaving(true);
    setTestResult(null);
    try {
      if (!automationId) {
        // The folder is sent on create only: the draft PATCH does not accept
        // it, and later moves go through the list's "Move to folder".
        const created = await createAutomation({
          ...buildPayload(),
          ...(folderId ? { folderId } : {}),
        });
        setAutomationId(created.id);
        setStatus(created.status);
        router.replace(`/automations/${created.id}`);
        return created.id;
      }
      const wasLive = status === "ENABLED";
      const updated = await updateAutomationDraft(automationId, buildPayload());
      if (republish && wasLive && updated.status !== "ENABLED") {
        await publishLatestVersion(automationId);
      } else {
        setStatus(updated.status);
      }
      return automationId;
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to save workflow");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(nextPublished: boolean) {
    const savedId = await handleSave({ republish: false });
    if (!savedId) return;
    setSaving(true);
    try {
      if (nextPublished) {
        await publishLatestVersion(savedId);
      } else {
        await disableAutomation(savedId);
        setStatus("DISABLED");
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to update workflow status");
      // Re-read rather than assume: the save above may already have moved it.
      try {
        setStatus((await getAutomation(savedId)).status);
      } catch {
        /* leave the toggle as-is if even the re-read fails */
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    const savedId = await handleSave();
    if (!savedId) return;
    try {
      const result = await dryRunAutomation(savedId, {
        entityType: primaryEntityType,
        snapshot: { id: "00000000-0000-0000-0000-000000000000", status: "NEW" },
      });
      setTestResult(
        result.valid
          ? `Valid. ${result.plannedSteps.length} step(s) would run for a matching record.`
          : `Invalid: ${result.errors.join(", ")}`
      );
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Test failed");
    }
  }

  const configuring = panel?.mode === "configure" ? getStepAtPath(steps, panel.path) : undefined;

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to workflows"
            onClick={() =>
              router.push(folderId ? `/automations?folder=${encodeURIComponent(folderId)}` : "/automations")
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-64 border-none text-base font-semibold shadow-none focus-visible:ring-1"
          />
        </div>
        <div className="flex items-center gap-3">
          {testResult && <span className="max-w-xs truncate text-xs text-slate-500">{testResult}</span>}
          <Button variant="outline" size="sm" onClick={handleTest} className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Test Workflow
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleSave()} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
            <span className={status === "ENABLED" ? "text-xs text-slate-400" : "text-xs font-medium text-slate-700"}>
              Draft
            </span>
            <Switch checked={status === "ENABLED"} onCheckedChange={handleTogglePublish} disabled={saving} />
            <span className={status === "ENABLED" ? "text-xs font-medium text-emerald-700" : "text-xs text-slate-400"}>
              Published
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex-1 bg-slate-50">
        <ReactFlow
          nodes={nodes}
          edges={graph.edges as Edge[]}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnScroll
        >
          <Background gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {panel?.mode === "pick-trigger" && (
        <TriggerPickerPanel
          onClose={() => {
            // Backing out of the picker on a card that was never given a type
            // would leave an unsavable blank behind, so it goes with it.
            setTriggers((prev) =>
              prev.length > 1 && !prev[panel.index]?.type
                ? prev.filter((_, i) => i !== panel.index)
                : prev
            );
            setPanel(null);
          }}
          onSelect={(type) => {
            const nextEntity = TRIGGER_CATALOG[type].entityType;
            setTriggers((prev) =>
              prev.map((trigger, i) =>
                i === panel.index
                  ? {
                      ...trigger,
                      type,
                      entityType: nextEntity,
                      config: {},
                      // Conditions name fields from
                      // AUTOMATION_FIELD_REGISTRY[entityType], so they cannot
                      // survive a switch to another entity — the backend
                      // rejects them with conditionFieldNotAllowed.
                      conditions:
                        nextEntity === trigger.entityType ? trigger.conditions : undefined,
                    }
                  : trigger
              )
            );
            setPanel({ mode: "configure-trigger", index: panel.index });
          }}
        />
      )}

      {panel?.mode === "configure-trigger" && triggers[panel.index]?.type && (
        <TriggerConfigPanel
          key={`${panel.index}:${triggers[panel.index].type}`}
          triggerType={triggers[panel.index].type as AutomationTriggerType}
          entityType={triggers[panel.index].entityType}
          conditions={triggers[panel.index].conditions}
          triggerConfig={triggers[panel.index].config}
          onBack={() => setPanel({ mode: "pick-trigger", index: panel.index })}
          onClose={() => setPanel(null)}
          onSave={(next) => {
            setTriggers((prev) =>
              prev.map((trigger, i) =>
                i === panel.index
                  ? { ...trigger, conditions: next.conditions, config: next.triggerConfig }
                  : trigger
              )
            );
            setPanel(null);
          }}
        />
      )}

      {panel?.mode === "trigger-stats" && triggers[panel.index] && (
        <TriggerStatsPanel
          trigger={triggers[panel.index]}
          stats={triggerStats[triggers[panel.index].key]}
          saved={Boolean(automationId)}
          onClose={() => setPanel(null)}
        />
      )}

      {panel?.mode === "pick-action" && (
        <ActionPickerPanel
          entityTypes={entityTypes}
          onClose={() => setPanel(null)}
          onSelectAction={(action) => {
            const step = newDefaultStep(action);
            setSteps((prev) => insertStepAtPath(prev, panel.insertPath, step));
            setPanel({ mode: "configure", path: panel.insertPath });
          }}
          onSelectFlowControl={(kind) => {
            const step = newDefaultStep(kind);
            setSteps((prev) => insertStepAtPath(prev, panel.insertPath, step));
            setPanel({ mode: "configure", path: panel.insertPath });
          }}
        />
      )}

      {panel?.mode === "configure" && configuring && (
        <StepConfigPanel
          key={panel.path}
          step={configuring}
          entityType={primaryEntityType}
          onClose={() => setPanel(null)}
          onSave={(updated) => {
            setSteps((prev) => updateStepAtPath(prev, panel.path, () => updated));
            setPanel(null);
          }}
          onDelete={() => onDeleteStep(panel.path)}
        />
      )}
    </div>
  );
}

function isNewId(id: string): boolean {
  return id === "new";
}

export function WorkflowBuilder({ id, folderId = null }: { id: string; folderId?: string | null }) {
  return (
    <ReactFlowProvider>
      <BuilderInner id={id} folderId={isNewId(id) ? folderId : null} />
    </ReactFlowProvider>
  );
}
