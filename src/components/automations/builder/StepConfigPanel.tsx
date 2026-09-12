"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";
import type { WorkspaceMember } from "@/lib/workspace-members/types";
import {
  ACTION_CATALOG,
  actionScopeEntity,
  AUTOMATION_ACTION_KEYS,
  FLOW_CONTROL_CATALOG,
  type AutomationActionStep,
  type AutomationEntityType,
  type AutomationIfElseStep,
  type AutomationStep,
  type AutomationWaitDurationStep,
  type AutomationWaitUntilStep,
} from "@/lib/automations/types";
import {
  actionFieldLabel,
  FIELD_META,
  splitActionConfigKeys,
  TASK_CREATING_ACTIONS,
  visibleActionConfigKeys,
} from "@/lib/automations/field-meta";
import {
  emailRecipientProblems,
  readEmailRecipients,
} from "@/lib/automations/email-recipients";
import { entityNoun } from "@/lib/automations/trigger-scope";

import { supportsRecordPicker } from "@/lib/automations/record-search";

import { RecordField } from "./RecordField";
import { ActionItemsField } from "./ActionItemsField";
import {
  encodeActionItemsInDescription,
  parseActionItemsBlock,
  stripActionItemsBlock,
} from "@/lib/tasks/action-items";
import { relatedTargetNoun } from "@/lib/automations/trigger-scope";
import { EmailRecipientsField } from "./EmailRecipientsField";
import { EmailTemplateField } from "./EmailTemplateField";

import { ConditionBuilder } from "./ConditionBuilder";
import { StepIcon } from "./nodes/icons";
import { SlideOverPanel } from "./SlideOverPanel";

function useMembers() {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    // No setStatus("loading") here: the initial state is already "loading"
    // and this effect runs once, so the call was redundant work inside an
    // effect body.
    listCrmWorkspaceMembers()
      .then((list) => {
        if (cancelled) return;
        setMembers(list);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { members, status };
}

function MemberSelect({
  value,
  onChange,
  members,
  membersStatus,
}: {
  value: string;
  onChange: (v: string) => void;
  members: WorkspaceMember[];
  membersStatus: "loading" | "ready" | "error";
}) {
  const placeholder =
    membersStatus === "loading"
      ? "Loading teammates..."
      : membersStatus === "error"
        ? "Couldn't load teammates"
        : "Select a teammate...";
  return (
    <Select
      items={members.map((m) => ({ label: m.name || m.email, value: m.userId }))}
      value={value || null}
      onValueChange={(v) => v && onChange(v)}
    >
      <SelectTrigger className="h-9 w-full text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {members.map((m) => (
          <SelectItem key={m.userId} value={m.userId}>
            {m.name || m.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The config keys SEND_EMAIL renders through its own recipients block. */
const EMAIL_RECIPIENT_KEYS = ["toEmail", "cc", "bcc"];

function ActionConfigForm({
  step,
  entityType,
  onChange,
  members,
  membersStatus,
}: {
  step: AutomationActionStep;
  entityType: AutomationEntityType;
  onChange: (config: Record<string, unknown>) => void;
  members: WorkspaceMember[];
  membersStatus: "loading" | "ready" | "error";
}) {
  // Declared before the early return below: an action with no configurable
  // fields must not change how many hooks this component calls.
  const [showAll, setShowAll] = useState(false);
  const keys = AUTOMATION_ACTION_KEYS[step.action];
  if (!keys) {
    return (
      <p className="text-sm text-slate-500">
        This action has no configurable fields.
      </p>
    );
  }
  const config = step.config ?? {};
  const email = step.action === "SEND_EMAIL";
  /**
   * Actions that create a task. Their `description` doubles as the task's
   * action-item checklist, so it gets a checklist editor and a textarea that
   * shows only the prose half.
   */
  const taskish = (TASK_CREATING_ACTIONS as readonly string[]).includes(
    step.action,
  );

  function set(key: string, value: unknown) {
    onChange({ ...config, [key]: value });
  }

  const { primary, more } = splitActionConfigKeys(
    step.action,
    visibleActionConfigKeys(step.action, keys.allowed, config),
    config,
  );

  function renderField(key: string) {
      const base = FIELD_META[key] ?? { label: key, widget: "text" as const };
      // An action may call the same field something else on its own form.
      const meta = {
        ...base,
        label: actionFieldLabel(step.action, key) ?? base.label,
      };
      // `recordId` is the one key every delete action shares, so what the
      // picker lists comes from the action's entity scope: DELETE_LEAD lists
      // leads, DELETE_DEAL deals. Left empty it still means "the record that
      // triggered this run", which is why the field stays optional.
      const scoped = key === "recordId" ? actionScopeEntity(step.action) : null;
      const recordTarget =
        meta.target ?? (scoped && supportsRecordPicker(scoped) ? scoped : null);
      // Only SEND_EMAIL's templateId picks from the email templates —
      // SEND_MESSAGE's reads the same table filtered to MESSAGE/SMS rows,
      // which that list does not return.
      const widget =
        email && key === "templateId"
          ? "emailTemplate"
          : key === "recordId" && recordTarget
            ? "record"
            : meta.widget;
      const required = keys.required.includes(key);
      const value = config[key];
      return (
        <div key={key}>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            {meta.label}
            {required && <span className="text-rose-500"> *</span>}
          </label>
          {widget === "emailTemplate" && (
            <EmailTemplateField
              value={typeof value === "string" ? value : ""}
              onChange={(templateId) => set(key, templateId)}
            />
          )}
          {widget === "textarea" && taskish && key === "description" && (
            <Textarea
              value={stripActionItemsBlock(
                typeof value === "string" ? value : "",
              )}
              onChange={(e) =>
                set(
                  key,
                  encodeActionItemsInDescription(
                    e.target.value,
                    parseActionItemsBlock(
                      typeof value === "string" ? value : "",
                    ),
                  ),
                )
              }
              placeholder={meta.placeholder}
              rows={3}
            />
          )}
          {widget === "textarea" && !(taskish && key === "description") && (
            <Textarea
              value={typeof value === "string" ? value : value ? JSON.stringify(value) : ""}
              onChange={(e) => set(key, e.target.value)}
              placeholder={meta.placeholder}
              rows={3}
            />
          )}
          {widget === "record" && (
            <RecordField
              target={recordTarget ?? "CONTACT"}
              value={typeof value === "string" ? value : ""}
              onChange={(id) => set(key, id || undefined)}
              noun={relatedTargetNoun(recordTarget ?? "CONTACT")}
            />
          )}
          {widget === "text" && (
            <Input
              value={typeof value === "string" ? value : ""}
              onChange={(e) => set(key, e.target.value)}
              placeholder={meta.placeholder}
            />
          )}
          {widget === "number" && (
            <Input
              type="number"
              value={typeof value === "number" ? value : ""}
              onChange={(e) => set(key, e.target.value === "" ? undefined : Number(e.target.value))}
              placeholder={meta.placeholder}
            />
          )}
          {widget === "datetime" && (
            <Input
              type="datetime-local"
              value={typeof value === "string" ? value.slice(0, 16) : ""}
              onChange={(e) => set(key, e.target.value ? new Date(e.target.value).toISOString() : undefined)}
            />
          )}
          {widget === "json" && (
            <JsonField
              value={value}
              placeholder={meta.placeholder}
              onChange={(next) => set(key, next)}
            />
          )}
          {widget === "checkbox" && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={value === true}
                onChange={(e) => set(key, e.target.checked ? true : undefined)}
              />
              {meta.placeholder ?? "Yes"}
            </label>
          )}
          {widget === "select" && (
            <Select
              items={meta.options ?? []}
              value={typeof value === "string" ? value : null}
              onValueChange={(v) => v && set(key, v)}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {meta.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {widget === "member" && (
            <MemberSelect
              value={typeof value === "string" ? value : ""}
              onChange={(v) => set(key, v)}
              members={members}
              membersStatus={membersStatus}
            />
          )}
          {widget === "members" && (
            <div className="space-y-1.5 rounded-lg border border-slate-200 p-2">
              {membersStatus === "loading" && (
                <p className="text-xs text-slate-400">Loading teammates...</p>
              )}
              {membersStatus === "error" && (
                <p className="text-xs text-rose-500">
                  Couldn&apos;t load teammates. Try closing and reopening this panel.
                </p>
              )}
              {membersStatus === "ready" && members.length === 0 && (
                <p className="text-xs text-slate-400">No teammates found.</p>
              )}
              {members.map((m) => {
                const list = Array.isArray(value) ? (value as string[]) : [];
                const checked = list.includes(m.userId);
                return (
                  <label key={m.userId} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        set(
                          key,
                          e.target.checked ? [...list, m.userId] : list.filter((id) => id !== m.userId)
                        )
                      }
                    />
                    {m.name || m.email}
                  </label>
                );
              })}
            </div>
          )}
          {widget === "tags" && (
            <Input
              value={Array.isArray(value) ? (value as string[]).join(", ") : ""}
              onChange={(e) =>
                set(
                  key,
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="tag-one, tag-two"
            />
          )}
          {meta.helpText && <p className="mt-1 text-[11px] text-slate-400">{meta.helpText}</p>}
          {taskish && key === "description" && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Action Items
              </label>
              <ActionItemsField
                description={typeof value === "string" ? value : ""}
                onChange={(next) => set(key, next)}
              />
            </div>
          )}
        </div>
      );
  }

  return (
    <div className="space-y-4">
      {email && (
        <EmailRecipientsField
          entityType={entityType}
          config={config}
          onChange={onChange}
        />
      )}
      {primary
        .filter((key) => !email || !EMAIL_RECIPIENT_KEYS.includes(key))
        .map(renderField)}

      {more.length > 0 && (
        <div className="border-t border-slate-200 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-0 text-xs text-slate-500 hover:text-slate-700"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {showAll ? "Hide extra fields" : `Show all fields (${more.length} more)`}
          </Button>
          {showAll && (
            <div className="mt-3 space-y-4">
              {more
                .filter((key) => !email || !EMAIL_RECIPIENT_KEYS.includes(key))
                .map(renderField)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WaitDurationForm({
  step,
  onChange,
}: {
  step: AutomationWaitDurationStep;
  onChange: (durationMs: number) => void;
}) {
  const units: [string, number][] = [
    ["Minutes", 60_000],
    ["Hours", 3_600_000],
    ["Days", 86_400_000],
  ];
  const bestUnit = units.reduce((best, u) => (step.durationMs % u[1] === 0 ? u : best), units[0]);
  const [amount, setAmount] = useState(Math.max(1, Math.round(step.durationMs / bestUnit[1])));
  const [unitMs, setUnitMs] = useState(bestUnit[1]);

  useEffect(() => onChange(amount * unitMs), [amount, unitMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
        className="w-24"
      />
      <Select
        items={units.map(([label, ms]) => ({ label, value: String(ms) }))}
        value={String(unitMs)}
        onValueChange={(v) => setUnitMs(Number(v))}
      >
        <SelectTrigger className="h-9 flex-1 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {units.map(([label, ms]) => (
            <SelectItem key={ms} value={String(ms)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface Props {
  step: AutomationStep;
  entityType: AutomationEntityType;
  onClose: () => void;
  onSave: (step: AutomationStep) => void;
  onDelete: () => void;
}

/**
 * The parent must render this with `key={<the step's path>}` so React
 * remounts it (and re-initializes `draft` from the new `step`) whenever a
 * different step is selected, instead of reusing the instance and needing
 * an effect to reset local state on prop change.
 */
export function StepConfigPanel({ step, entityType, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<AutomationStep>(step);
  const { members, status: membersStatus } = useMembers();

  const meta = useMemo(() => {
    if (draft.type === "ACTION") return ACTION_CATALOG[draft.action as keyof typeof ACTION_CATALOG];
    if (draft.type === "IF_ELSE") return FLOW_CONTROL_CATALOG.IF_ELSE;
    if (draft.type === "WAIT_FOR_DURATION") return FLOW_CONTROL_CATALOG.WAIT_FOR_DURATION;
    return FLOW_CONTROL_CATALOG.WAIT_UNTIL_DATE;
  }, [draft]);

  const missingRequired =
    draft.type === "ACTION"
      ? (AUTOMATION_ACTION_KEYS[draft.action]?.required ?? []).filter((key) => {
          const v = draft.config?.[key];
          return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
        })
      : draft.type === "IF_ELSE"
        ? draft.condition.items.length === 0
          ? ["condition"]
          : []
        : [];

  /**
   * Recipient rules the required-key check cannot express: `toEmail` is
   * optional (unset means the trigger record's address), but a half-typed
   * address, an entity with no address to resolve, or more than 50 mailboxes
   * would all be rejected downstream.
   */
  const recipientProblems =
    draft.type === "ACTION" && draft.action === "SEND_EMAIL"
      ? emailRecipientProblems(
          readEmailRecipients(draft.config ?? {}),
          entityType,
          entityNoun(entityType).one,
        )
      : [];
  const blocked = missingRequired.length > 0 || recipientProblems.length > 0;

  return (
    <SlideOverPanel
      title={meta?.label ?? "Configure Step"}
      subtitle={meta && "category" in meta ? meta.category : undefined}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={onDelete}>
            Remove Step
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={blocked} onClick={() => onSave(draft)}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
          <StepIcon icon={meta?.icon ?? "workflow"} className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="text-sm text-slate-500">
          {draft.type === "ACTION" && "Runs this action against the record that triggered the workflow."}
          {draft.type === "WAIT_FOR_DURATION" && "Pauses the workflow for a fixed amount of time."}
          {draft.type === "WAIT_UNTIL_DATE" && "Pauses the workflow until a specific date/time."}
          {draft.type === "IF_ELSE" &&
            "Splits the workflow. Add steps to the Then/Else branches directly on the canvas."}
        </div>
      </div>

      {draft.type === "ACTION" && (
        <ActionConfigForm
          step={draft}
          entityType={entityType}
          members={members}
          membersStatus={membersStatus}
          onChange={(config) => setDraft({ ...draft, config })}
        />
      )}

      {draft.type === "WAIT_FOR_DURATION" && (
        <WaitDurationForm step={draft} onChange={(durationMs) => setDraft({ ...draft, durationMs })} />
      )}

      {draft.type === "WAIT_UNTIL_DATE" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Wait Until</label>
          <Input
            type="datetime-local"
            value={draft.until ? draft.until.slice(0, 16) : ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                until: e.target.value ? new Date(e.target.value).toISOString() : draft.until,
              } as AutomationWaitUntilStep)
            }
          />
        </div>
      )}

      {draft.type === "IF_ELSE" && (
        <ConditionBuilder
          entityType={entityType}
          group={draft.condition}
          onChange={(condition) => setDraft({ ...draft, condition } as AutomationIfElseStep)}
        />
      )}

      {blocked && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-600">
          <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {draft.type === "IF_ELSE"
            ? "Add at least one condition to save."
            : missingRequired.length > 0
              ? `Missing: ${missingRequired.join(", ")}`
              : recipientProblems[0]}
        </p>
      )}
    </SlideOverPanel>
  );
}

/**
 * A JSON object/array field. The API expects a real object here — a plain
 * textarea would send the string the user typed, which the executor reads as
 * an empty object and then rejects with `noMutableFields`.
 *
 * Keeps its own text state so an in-progress edit is not destroyed on every
 * keystroke, and only propagates a value once it parses.
 */
function JsonField({
  value,
  placeholder,
  onChange,
}: {
  value: unknown;
  placeholder?: string;
  onChange: (next: unknown) => void;
}) {
  const [text, setText] = useState(() =>
    value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Textarea
        value={text}
        rows={4}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (!next.trim()) {
            setError(null);
            onChange(undefined);
            return;
          }
          try {
            onChange(JSON.parse(next));
            setError(null);
          } catch {
            setError("Not valid JSON yet");
          }
        }}
      />
      {error && <p className="mt-1 text-xs text-amber-600">{error}</p>}
    </>
  );
}
