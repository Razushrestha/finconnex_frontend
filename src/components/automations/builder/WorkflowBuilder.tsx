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
import { buildWorkflowGraph, type BuilderNode } from "@/lib/automations/layout";
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
  BranchLabelNode,
  EndNode,
  IfElseNode,
  TriggerNode,
  WaitNode,
} from "./nodes/WorkflowNodes";
import { ActionPickerPanel, TriggerPickerPanel } from "./StepPickerPanel";
import { StepConfigPanel } from "./StepConfigPanel";
import { TriggerConfigPanel } from "./TriggerConfigPanel";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  wait: WaitNode,
  ifElse: IfElseNode,
  branchLabel: BranchLabelNode,
  addStep: AddStepNode,
  end: EndNode,
};

type PanelState =
  | { mode: "pick-trigger" }
  | { mode: "configure-trigger" }
  | { mode: "pick-action"; insertPath: string }
  | { mode: "configure"; path: string };

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

function BuilderInner({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === "new";

  const [automationId, setAutomationId] = useState<string | null>(isNew ? null : id);
  const [name, setName] = useState("Untitled Workflow");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType | null>(null);
  const [entityType, setEntityType] = useState<AutomationEntityType>("LEAD");
  /**
   * The definition's top-level condition group. This is what narrows a
   * trigger to one record or to a filtered set — the backend refuses a
   * `triggerConfig` for anything but the five temporal triggers, so scope
   * lives here (see trigger-scope.ts).
   */
  const [conditions, setConditions] = useState<AutomationConditionGroup | undefined>(undefined);
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({});
  /** The last record resolved for a RECORD-scoped trigger, kept whole so the
   * label is only used when it still belongs to the pinned id. */
  const [scopeRecord, setScopeRecord] = useState<AutomationRecordOption | null>(null);
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
        setName(automation.name);
        setStatus(automation.status);
        setTriggerType((latest?.triggerType as AutomationTriggerType) ?? null);
        setEntityType(
          (latest?.definition?.trigger?.entityType as AutomationEntityType) ?? "LEAD"
        );
        setSteps((latest?.definition?.steps as AutomationStep[]) ?? []);
        setConditions(latest?.definition?.conditions ?? undefined);
        setTriggerConfig(latest?.definition?.trigger?.config ?? {});
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const transition = transitionMeta(triggerType);
  const changedFields = changedFieldMeta(triggerType);
  /**
   * Owner-backed transitions store user ids. The canvas caption has to render
   * names, so the same list the panel offers is loaded here too — a bare uuid
   * on the node would be unreadable.
   */
  const [owners, setOwners] = useState<TransitionOption[]>([]);
  const ownerBacked = transition?.source === "owners";
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
  const filter = useMemo(
    () => readTriggerFilter(conditions, transition?.fields ?? null),
    [conditions, transition]
  );
  const scope = filter.scope;

  /**
   * Resolve a pinned record id to its name for the canvas subtitle. Only a
   * lone pin gets a name — a set is captioned by its count.
   */
  const pinnedIds = scopeRecordIds(scope);
  const pinnedRecordId = pinnedIds.length === 1 ? pinnedIds[0] : "";
  useEffect(() => {
    if (!pinnedRecordId) return;
    let cancelled = false;
    describeAutomationRecord(entityType, pinnedRecordId).then((option) => {
      if (!cancelled && option) setScopeRecord(option);
    });
    return () => {
      cancelled = true;
    };
  }, [entityType, pinnedRecordId]);

  const scopeSummary = useMemo(() => {
    if (!triggerType) return undefined;
    const scopeText = describeTriggerScope(
      scope,
      entityType,
      // Only trust the resolved label while it still names the pinned
      // record — otherwise a stale name would caption a new selection.
      scopeRecord?.id === pinnedRecordId ? scopeRecord.label : null
    );
    const detail = transition
      ? describeTransition(filter.transition, transition, transition.options ?? owners)
      : changedFields
        ? describeChangedFields(filter.changedFields, changedFields)
        : null;
    return detail ? `${scopeText} · ${detail}` : scopeText;
  }, [
    triggerType,
    scope,
    entityType,
    scopeRecord,
    pinnedRecordId,
    transition,
    filter.transition,
    changedFields,
    filter.changedFields,
    owners,
  ]);

  const graph = useMemo(
    () => buildWorkflowGraph(triggerType, steps, scopeSummary),
    [triggerType, steps, scopeSummary]
  );

  const selectedPath =
    panel?.mode === "configure"
      ? panel.path
      : panel?.mode === "pick-trigger" || panel?.mode === "configure-trigger"
        ? "trigger"
        : null;

  /**
   * Clicking the trigger node goes straight to its configuration once a
   * trigger is chosen — "Change trigger" in that panel is the way back to the
   * list, so re-picking is deliberate instead of the only thing a click does.
   */
  const onSelectTrigger = useCallback(
    () => setPanel(triggerType ? { mode: "configure-trigger" } : { mode: "pick-trigger" }),
    [triggerType]
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
          interactions: { onSelectTrigger, onSelectStep, onDeleteStep, onAddAt, selectedPath },
        },
      })),
    [graph.nodes, onSelectTrigger, onSelectStep, onDeleteStep, onAddAt, selectedPath]
  );

  function buildPayload() {
    return {
      name,
      triggerType: triggerType as AutomationTriggerType,
      entityType,
      triggerConfig,
      // Explicitly null, never undefined: PATCH reads `dto.conditions ??
      // current.conditions`, so an omitted key would silently keep the old
      // scope when the user switches back to "any record".
      conditions: conditions ?? null,
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
    if (!triggerType) {
      window.alert("Choose a trigger before saving.");
      return null;
    }
    setSaving(true);
    setTestResult(null);
    try {
      if (!automationId) {
        const created = await createAutomation(buildPayload());
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
        entityType,
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
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/automations")}>
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
          onClose={() => setPanel(null)}
          onSelect={(trigger) => {
            const nextEntity = TRIGGER_CATALOG[trigger].entityType;
            // Conditions name fields from AUTOMATION_FIELD_REGISTRY[entityType],
            // so they can't survive a switch to a different entity — the
            // backend would reject them with conditionFieldNotAllowed.
            if (nextEntity !== entityType) {
              setConditions(undefined);
              setScopeRecord(null);
            }
            setTriggerConfig({});
            setTriggerType(trigger);
            setEntityType(nextEntity);
            setPanel({ mode: "configure-trigger" });
          }}
        />
      )}

      {panel?.mode === "configure-trigger" && triggerType && (
        <TriggerConfigPanel
          key={triggerType}
          triggerType={triggerType}
          entityType={entityType}
          conditions={conditions}
          triggerConfig={triggerConfig}
          onBack={() => setPanel({ mode: "pick-trigger" })}
          onClose={() => setPanel(null)}
          onSave={(next) => {
            setConditions(next.conditions);
            setTriggerConfig(next.triggerConfig);
            setPanel(null);
          }}
        />
      )}

      {panel?.mode === "pick-action" && (
        <ActionPickerPanel
          entityType={entityType}
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
          entityType={entityType}
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

export function WorkflowBuilder({ id }: { id: string }) {
  return (
    <ReactFlowProvider>
      <BuilderInner id={id} />
    </ReactFlowProvider>
  );
}
