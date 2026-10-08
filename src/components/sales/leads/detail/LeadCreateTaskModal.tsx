"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import RelatedRecordCombobox from "@/components/activities/tasks/RelatedRecordComboBox";
import AttachmentUpload from "@/components/activities/tasks/AttachmentUpload";
import {
  ReminderSettingsCard,
  TaskRepeatBlock,
  turnOffReminderRepeat,
} from "@/components/activities/tasks/ReminderSettingsCard";
import {
  emptyInlineTaskNote,
  formatInlineTaskNote,
  InlineTaskNoteComposer,
  type InlineTaskNoteValue,
} from "@/components/shared/InlineTaskNoteComposer";
import {
  RELATED_ENTITY_KINDS,
  avatarColor,
  initials as sharedInitials,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import type { NotificationMethod } from "@/lib/reminders/types";
import { liveRelatedRecords } from "@/lib/activities/related-records";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import { leadApplicants } from "@/lib/leads/detail-snapshot";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";
import { listAllContacts } from "@/lib/contacts/store";
import type { LeadCardData } from "@/lib/leads/types";
import {
  logCreate,
  notifyOwnerAssigned,
  notifyTaskDue,
  requireAction,
} from "@/lib/rules";
import { getRulesActor } from "@/lib/rules/actor";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  addTaskActivityNote,
  createTask,
  deleteTask,
  findTaskById,
  patchTask,
  updateTaskStatus,
} from "@/lib/tasks/store";
import {
  createCrmTask,
  isCrmTaskId,
  persistRemoteTask,
  tryCrmTask,
  updateCrmTask,
} from "@/lib/tasks/api";
import { attachFilesToTask } from "@/lib/tasks/attach-files";
import {
  TASK_OWNERS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  notifyToMethod,
  type Priority,
  type ReminderNotifyOption,
  type TaskActionItem,
  type TaskStatus,
  type TaskType,
} from "@/lib/tasks/types";
import {
  defaultReminderRepeatRule,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import { buildRemindersFromSchedule } from "@/lib/tasks/reminder-series";
import { cn } from "@/lib/utils";

const PURPLE = "#5A32A3";
const MAX_COLLABORATORS = 3;

function collaboratorAddLabel(count: number) {
  const nextSlot = count + 1;
  if (nextSlot === 1) return "Add 1st collaborator";
  if (nextSlot === 2) return "Add 2nd collaborator";
  if (nextSlot === 3) return "Add 3rd collaborator";
  return `Add collaborator ${nextSlot}`;
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#5A32A3] focus:outline-none focus:ring-2 focus:ring-[#5A32A3]/20";
const labelClass = "mb-1 block text-[12px] font-medium text-slate-600";

type View = "main" | "more";

function initials(name: string) {
  return sharedInitials(name);
}

function parseDatetimeLocal(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfMinute(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  return next;
}

function formatStoredTaskDateTime(value: string): string {
  const parsed = parseDatetimeLocal(value);
  if (!parsed) return value.trim();
  return parsed.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function reminderNotifyFromMethods(
  methods: Array<"Email" | "SMS" | "In-app" | "Web Push">,
): ReminderNotifyOption {
  const hasEmail = methods.includes("Email");
  const hasPopup =
    methods.includes("In-app") ||
    methods.includes("Web Push") ||
    methods.includes("SMS");
  if (hasEmail && hasPopup) return "Both";
  if (hasEmail) return "Email";
  return "Pop Up";
}

function remindersFromForm(
  reminderDate: string,
  notifyBy: NotificationMethod[],
  rule: ReminderRepeatRule,
  dueDate: string,
) {
  const parsed = parseDatetimeLocal(reminderDate);
  if (!parsed) return undefined;
  const notify = reminderNotifyFromMethods(notifyBy);
  return buildRemindersFromSchedule({
    first: parsed,
    due: parseDatetimeLocal(dueDate),
    rule,
    notify,
    notificationMethod: notifyToMethod(notify),
    type: "Task Due",
  });
}

function newActionItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function relatedOptionsFor(
  kind: RelatedEntityKind,
  extra?: { kind: RelatedEntityKind; name: string },
) {
  return liveRelatedRecords(kind, extra);
}

function contactSearchOptions(card: LeadCardData) {
  const seen = new Set<string>();
  const rows: { kind: string; name: string }[] = [];
  function add(kind: string, name: string) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    rows.push({ kind, name: name.trim() });
  }
  for (const person of leadApplicants(card)) {
    add(
      person.role === "Primary" ? "Primary applicant" : "Co-applicant",
      person.name,
    );
  }
  for (const contact of listAllContacts()) add("Contact", contact.name);
  for (const lead of liveRelatedRecords("Lead")) add("Lead", lead.name);
  return rows;
}

export type TaskModalDraft = {
  id: string;
  title: string;
  subtitle?: string;
  at: Date;
  owner: string;
  priority?: "high" | "normal" | "low";
};

export function LeadCreateTaskModal({
  open,
  card,
  onClose,
  onSaved,
  editTaskId = null,
  draft = null,
}: {
  open: boolean;
  card: LeadCardData;
  onClose: () => void;
  onSaved?: (replacedSeedId?: string) => void;
  editTaskId?: string | null;
  draft?: TaskModalDraft | null;
}) {
  const [view, setView] = useState<View>("main");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("High");
  const [assignedTo, setAssignedTo] = useState(card.owner);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [reminderOn, setReminderOn] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [notifyBy, setNotifyBy] = useState<NotificationMethod[]>(["Email"]);
  const [taskRepeat, setTaskRepeat] = useState<ReminderRepeatRule>(
    defaultReminderRepeatRule,
  );
  const [reminderRepeat, setReminderRepeat] = useState<ReminderRepeatRule>(
    defaultReminderRepeatRule,
  );
  const [contactName, setContactName] = useState(
    () => leadApplicants(card)[0]?.name || card.name,
  );
  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind>("Lead");
  const [relatedName, setRelatedName] = useState(card.name);
  const [taskType, setTaskType] = useState<TaskType>("Follow-up");
  const [status, setStatus] = useState<TaskStatus>("Not Started");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState<InlineTaskNoteValue>(() => emptyInlineTaskNote());
  const [attachments, setAttachments] = useState<File[]>([]);

  const [actionItems, setActionItems] = useState<TaskActionItem[]>([]);
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const [collaboratorMenuPos, setCollaboratorMenuPos] = useState<{
    top: number;
    left: number;
    openUp: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const pendingActionFocus = useRef<string | null>(null);
  const collaboratorPickerRef = useRef<HTMLDivElement>(null);
  const collaboratorAddBtnRef = useRef<HTMLButtonElement>(null);
  const collaboratorMenuRef = useRef<HTMLDivElement>(null);

  function openCollaboratorMenu() {
    const rect = collaboratorAddBtnRef.current?.getBoundingClientRect();
    if (!rect) {
      setAddingCollaborator(true);
      return;
    }
    const menuHeight = 220;
    const openUp = window.innerHeight - rect.bottom < menuHeight + 16;
    setCollaboratorMenuPos({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - 272),
      openUp,
    });
    setAddingCollaborator(true);
  }

  function closeCollaboratorMenu() {
    setAddingCollaborator(false);
    setCollaboratorSearch("");
    setCollaboratorMenuPos(null);
  }

  const editing = Boolean(editTaskId || draft);

  // Reset the draft whenever the modal (re)opens for a different
  // task/draft. Computed during render — gated on a state diff of the
  // reset key, per React's documented "adjusting state when a prop
  // changes" pattern — instead of in an effect (react-hooks/set-state-in-effect).
  const resetKey = `${open}|${card.name}|${card.owner}|${editTaskId ?? ""}|${draft?.id ?? ""}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    resetDraft();
  }

  function resetDraft() {
    if (!open) return;
    setView("main");
    setError("");
    setSaving(false);

    const live = editTaskId ? findTaskById(editTaskId)?.task : null;
    if (live) {
      const due = parseFlexibleDate(live.dueDate);
      const reminder = parseFlexibleDate(live.reminderDate);
      setTitle(live.title);
      setDueDate(due ? toDatetimeLocalValue(due) : "");
      setPriority(live.priority);
      setAssignedTo(live.assignedTo || card.owner);
      setCollaborators(live.collaborators ?? []);
      setReminderOn(Boolean(live.reminderDate));
      setRepeatOn(Boolean(live.repeatRule && live.repeatRule.preset !== "none"));
      setReminderDate(reminder ? toDatetimeLocalValue(reminder) : "");
      setNotifyBy(
        live.notifyBy?.length ? [...live.notifyBy] : ["Email"],
      );
      setTaskRepeat(
        live.repeatRule && live.repeatRule.preset !== "none"
          ? { ...live.repeatRule, weekdays: [...live.repeatRule.weekdays] }
          : defaultReminderRepeatRule,
      );
      setReminderRepeat(
        live.reminders?.find((item) => item.repeatRule)?.repeatRule ??
          defaultReminderRepeatRule,
      );
      setContactName(leadApplicants(card)[0]?.name || card.name);
      setRelatedKind(live.relatedTo?.kind ?? "Lead");
      setRelatedName(live.relatedTo?.name ?? card.name);
      setTaskType(live.taskType);
      setStatus(live.status === "Completed" ? "Completed" : live.status);
      setDescription(live.description ?? "");
      setNote({
        title: "",
        body: live.notes ?? "",
        attachments: [],
      });
      setAttachments([]);
      setActionItems(live.actionItems ?? []);
      return;
    }

    if (draft) {
      setTitle(draft.title);
      setDueDate(toDatetimeLocalValue(draft.at));
      setPriority(
        draft.priority === "high"
          ? "High"
          : draft.priority === "low"
            ? "Low"
            : "Medium",
      );
      setAssignedTo(draft.owner || card.owner);
      setCollaborators([]);
      setReminderOn(false);
      setRepeatOn(false);
      setReminderDate("");
      setNotifyBy(["Email"]);
      setTaskRepeat(defaultReminderRepeatRule);
      setReminderRepeat(defaultReminderRepeatRule);
      setContactName(leadApplicants(card)[0]?.name || card.name);
      setRelatedKind("Lead");
      setRelatedName(card.name);
      setTaskType("Follow-up");
      setStatus("Not Started");
      setDescription(draft.subtitle ?? "");
      setNote(emptyInlineTaskNote());
      setAttachments([]);
      setActionItems([]);
      return;
    }

    setTitle("");
    setDueDate("");
    setPriority("High");
    setAssignedTo(card.owner);
    setCollaborators([]);
    setReminderOn(false);
    setRepeatOn(false);
    setReminderDate("");
    setNotifyBy(["Email"]);
    setTaskRepeat(defaultReminderRepeatRule);
    setReminderRepeat(defaultReminderRepeatRule);
    setContactName(leadApplicants(card)[0]?.name || card.name);
    setRelatedKind("Lead");
    setRelatedName(card.name);
    setTaskType("Follow-up");
    setStatus("Not Started");
    setDescription("");
    setNote(emptyInlineTaskNote());
      setAttachments([]);
    setActionItems([]);
  }

  useEffect(() => {
    if (!addingCollaborator) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        collaboratorPickerRef.current?.contains(target) ||
        collaboratorMenuRef.current?.contains(target)
      ) {
        return;
      }
      closeCollaboratorMenu();
    }
    function handleReposition() {
      const rect = collaboratorAddBtnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuHeight = 220;
      const openUp = window.innerHeight - rect.bottom < menuHeight + 16;
      setCollaboratorMenuPos({
        top: openUp ? rect.top - 6 : rect.bottom + 6,
        left: Math.min(rect.left, window.innerWidth - 272),
        openUp,
      });
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleReposition);
    };
  }, [addingCollaborator]);

  const owners = useMemo(() => {
    if (TASK_OWNERS.includes(card.owner as (typeof TASK_OWNERS)[number])) {
      return [...TASK_OWNERS];
    }
    return [card.owner, ...TASK_OWNERS];
  }, [card.owner]);

  const availableCollaborators = owners.filter(
    (owner) => owner !== assignedTo && !collaborators.includes(owner),
  );
  const filteredCollaborators = availableCollaborators.filter((owner) =>
    owner.toLowerCase().includes(collaboratorSearch.trim().toLowerCase()),
  );
  const canAddCollaborator = collaborators.length < MAX_COLLABORATORS;
  const addCollaboratorLabel = collaboratorAddLabel(collaborators.length);

  const relatedOptions = relatedOptionsFor(relatedKind, {
    kind: "Lead",
    name: card.name,
  });
  const contactOptions = contactSearchOptions(card);

  const minDueDate = toDatetimeLocalValue(startOfMinute(new Date()));
  const due = parseDatetimeLocal(dueDate);

  function addCollaborator(name: string) {
    if (
      !name ||
      name === assignedTo ||
      collaborators.includes(name) ||
      collaborators.length >= MAX_COLLABORATORS
    ) {
      return;
    }
    setCollaborators((prev) => [...prev, name]);
    setAddingCollaborator(false);
    setCollaboratorSearch("");
  }

  function removeCollaborator(name: string) {
    setCollaborators((prev) => prev.filter((item) => item !== name));
  }

  function toggleNotifyBy(method: NotificationMethod) {
    setNotifyBy((prev) => {
      const selected = prev.includes(method);
      return selected
        ? prev.filter((item) => item !== method)
        : [...prev, method];
    });
  }

  function pruneBlankActionItems() {
    setActionItems((prev) => prev.filter((row) => row.text.trim().length > 0));
  }

  function addActionLine(afterId: string) {
    const id = newActionItemId();
    pendingActionFocus.current = id;
    setActionItems((prev) => {
      const next = { id, text: "", done: false };
      const index = prev.findIndex((row) => row.id === afterId);
      if (index === -1) return [...prev, next];
      const copy = [...prev];
      copy.splice(index + 1, 0, next);
      return copy;
    });
  }

  function dropBlankActionLine(id: string) {
    setActionItems((prev) => {
      const row = prev.find((item) => item.id === id);
      if (!row || row.text.trim()) return prev;
      const next = prev.filter((item) => item.id !== id);
      if (view === "more" && next.length === 0) {
        return [{ id: newActionItemId(), text: "", done: false }];
      }
      return next;
    });
  }

  const filledActionItems = actionItems.filter((row) => row.text.trim().length > 0);

  useEffect(() => {
    const id = pendingActionFocus.current;
    if (!id) return;
    const field = document.getElementById(`lead-action-item-${id}`);
    field?.focus();
    pendingActionFocus.current = null;
  }, [actionItems]);

  async function handleSave() {
    if (!title.trim()) {
      setError("Add a subject");
      setView("main");
      return;
    }
    if (
      dueDate.trim() &&
      due &&
      !editing &&
      due.getTime() < startOfMinute(new Date()).getTime()
    ) {
      setError("Due date cannot be before now");
      setView("main");
      return;
    }
    if (!editTaskId) {
      const gate = requireAction("activities.tasks.create");
      if (!gate.ok) {
        setError(gate.message);
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      const related = {
        kind: "Lead" as const,
        name: card.name,
      };
      const extraRelated =
        relatedName.trim() &&
        (relatedKind !== "Lead" || relatedName.trim() !== card.name)
          ? `Related to ${relatedKind}: ${relatedName.trim()}`
          : "";
      const contactLine =
        contactName.trim() && contactName.trim() !== card.name
          ? `Contact: ${contactName.trim()}`
          : "";
      const noteBlock = formatInlineTaskNote(note);
      const combinedNotes = [extraRelated, contactLine, noteBlock]
        .filter(Boolean)
        .join("\n");

      const storedDue = dueDate.trim()
        ? formatStoredTaskDateTime(dueDate)
        : "";
      const reminderPayload =
        reminderOn && reminderDate.trim()
          ? formatStoredTaskDateTime(reminderDate)
          : undefined;
      const reminders =
        reminderOn && reminderDate.trim()
          ? remindersFromForm(
              reminderDate,
              notifyBy,
              reminderRepeat,
              dueDate,
            )
          : undefined;
      const notifyPayload =
        reminderOn && reminderDate.trim() && notifyBy.length
          ? notifyBy
          : undefined;
      const repeatRulePayload =
        repeatOn && taskRepeat.preset !== "none" ? taskRepeat : undefined;

      if (editTaskId && findTaskById(editTaskId)) {
        patchTask(editTaskId, {
          title: title.trim(),
          taskType,
          priority,
          dueDate: storedDue,
          reminderDate: reminderPayload,
          reminders,
          assignedTo,
          relatedTo: related,
          description: description.trim() || undefined,
          notes: combinedNotes || undefined,
          collaborators: collaborators.length ? collaborators : undefined,
          actionItems: filledActionItems.length ? filledActionItems : undefined,
          notifyBy: notifyPayload,
          repeatRule: repeatRulePayload,
        });
        if (status !== "Completed") updateTaskStatus(editTaskId, status);
        if (isCrmTaskId(editTaskId)) {
          await tryCrmTask(() =>
            updateCrmTask(editTaskId, {
              title: title.trim(),
              taskType,
              priority,
              status,
              dueDate: formatStoredTaskDateTime(dueDate),
              assignedTo,
              relatedTo: related,
              description: description.trim() || undefined,
              notes: combinedNotes || undefined,
            }),
          );
        }
        if (attachments.length) {
          await attachFilesToTask(editTaskId, attachments);
        }
        emitLeadActivityChange();
        onSaved?.();
        onClose();
        return;
      }

      const taskInput = {
        title: title.trim(),
        taskType,
        priority,
        status,
        dueDate: storedDue,
        reminderDate: reminderPayload,
        reminders,
        assignedTo,
        relatedTo: related,
        description: description.trim() || undefined,
        notes: combinedNotes || undefined,
        collaborators: collaborators.length ? collaborators : undefined,
        actionItems: filledActionItems.length ? filledActionItems : undefined,
        notifyBy: notifyPayload,
        repeatRule: repeatRulePayload,
        createdBy: getRulesActor().name || assignedTo,
      };
      let task = createTask(taskInput);
      if (isUuid(card.id)) {
        const remote = await tryCrmTask(() =>
          createCrmTask({
            title: title.trim(),
            taskType,
            priority,
            status,
            dueDate: formatStoredTaskDateTime(dueDate),
            assignedTo,
            relatedTo: related,
            relatedId: card.id,
            description: description.trim() || undefined,
            notes: combinedNotes || undefined,
            collaborators: collaborators.length ? collaborators : undefined,
            actionItems: filledActionItems.length ? filledActionItems : undefined,
          }),
        );
        if (remote && remote.taskId !== task.taskId) {
          deleteTask(task.taskId);
          persistRemoteTask({
            ...task,
            ...remote,
            relatedTo: related,
            notes: task.notes ?? remote.notes,
            activityNotes: task.activityNotes,
            actionItems: remote.actionItems?.length
              ? remote.actionItems
              : task.actionItems,
          });
          task = findTaskById(remote.taskId)?.task ?? remote;
        }
      }
      if (attachments.length) {
        await attachFilesToTask(task.taskId, attachments);
      }
      const createNote = combinedNotes.trim();
      if (createNote) {
        const already = (findTaskById(task.taskId)?.task.activityNotes ?? []).some(
          (note) => note.body.trim() === createNote,
        );
        if (!already) {
          addTaskActivityNote(task.taskId, createNote);
        }
      }
      logCreate("activities.tasks", assignedTo, task.taskId, title.trim());
      notifyOwnerAssigned({
        owner: assignedTo,
        entityLabel: `Task ${title.trim()}`,
        relatedTo: `Lead: ${card.name}`,
        relatedHref: `/activities/tasks`,
        type: "Task Assigned",
      });
      notifyTaskDue({
        recipient: assignedTo,
        taskTitle: title.trim(),
        relatedTo: `Lead: ${card.name}`,
        relatedHref: "/activities/tasks",
      });
      emitLeadActivityChange();
      onSaved?.(draft?.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save task");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-full overflow-hidden p-0 sm:max-w-[28rem]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            {view === "more" ? (
              <button
                type="button"
                onClick={() => {
                  pruneBlankActionItems();
                  setView("main");
                }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}
            <DialogTitle className="text-[16px] font-semibold text-slate-900">
              {view === "more"
                ? "More Fields"
                : editing
                  ? "Edit Task"
                  : "Create Task"}
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <DialogDescription className="sr-only">
          Create a task for {card.name} without leaving this lead.
        </DialogDescription>

        <div className="max-h-[min(68vh,36rem)] overflow-y-auto px-5 py-3">
          {view === "main" ? (
            <div key="main" className="animate-in fade-in-0 slide-in-from-left-2 space-y-3 duration-200">
              <div>
                <label className={labelClass}>
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  className={inputClass}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Follow up with client"
                />
              </div>
              <div>
                <label className={labelClass}>Due Date</label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="datetime-local"
                    min={minDueDate}
                    className={cn(inputClass, "pl-9")}
                    value={dueDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDueDate(value);
                      if (!value.trim()) {
                        setReminderOn(false);
                        setReminderDate("");
                        setNotifyBy(["Email"]);
                        setRepeatOn(false);
                        setTaskRepeat(defaultReminderRepeatRule);
                        setReminderRepeat(defaultReminderRepeatRule);
                      }
                    }}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select
                  className={inputClass}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  {TASK_PRIORITIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Owner</label>
                <select
                  className={inputClass}
                  value={assignedTo}
                  onChange={(e) => {
                    setAssignedTo(e.target.value);
                    setCollaborators((prev) =>
                      prev.filter((name) => name !== e.target.value),
                    );
                  }}
                >
                  {owners.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Collaborators</label>
                <div className="relative mt-1.5" ref={collaboratorPickerRef}>
                  <div className="flex items-center gap-1">
                    {collaborators.map((name, index) => (
                      <span
                        key={`${name}-${index}`}
                        className="group relative shrink-0"
                      >
                        <span
                          title={name}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold",
                            avatarColor(name),
                          )}
                        >
                          {initials(name)}
                        </span>
                        <button
                          type="button"
                          title={`Remove ${name}`}
                          onClick={() => removeCollaborator(name)}
                          className="absolute -top-1 -right-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-700 text-white group-hover:flex"
                          aria-label={`Remove collaborator ${name}`}
                        >
                          <X className="h-2 w-2" strokeWidth={3} />
                        </button>
                      </span>
                    ))}
                    {canAddCollaborator &&
                    (filteredCollaborators.length > 0 ||
                      addingCollaborator) ? (
                      <button
                        ref={collaboratorAddBtnRef}
                        type="button"
                        title={addCollaboratorLabel}
                        aria-label={addCollaboratorLabel}
                        aria-expanded={addingCollaborator}
                        onClick={() => {
                          if (addingCollaborator) closeCollaboratorMenu();
                          else openCollaboratorMenu();
                        }}
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed transition-colors",
                          addingCollaborator
                            ? "border-[#5A32A3] bg-[#F3ECFB] text-[#5A32A3]"
                            : "border-slate-300 text-slate-400 hover:border-[#5A32A3] hover:text-[#5A32A3]",
                        )}
                      >
                        <Plus className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    ) : null}
                  </div>
                  {addingCollaborator && collaboratorMenuPos
                    ? createPortal(
                        <div
                          ref={collaboratorMenuRef}
                          className="fixed z-[120] w-64 overflow-hidden rounded-xl bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5"
                          style={{
                            left: collaboratorMenuPos.left,
                            top: collaboratorMenuPos.openUp
                              ? undefined
                              : collaboratorMenuPos.top,
                            bottom: collaboratorMenuPos.openUp
                              ? window.innerHeight - collaboratorMenuPos.top
                              : undefined,
                          }}
                        >
                          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                            {addCollaboratorLabel}
                          </p>
                          <div className="px-2 pb-2">
                            <label className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-50 px-2 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#5A32A3]">
                              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <input
                                autoFocus
                                value={collaboratorSearch}
                                onChange={(e) =>
                                  setCollaboratorSearch(e.target.value)
                                }
                                placeholder="Search collaborators…"
                                className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
                              />
                            </label>
                          </div>
                          <div className="max-h-40 overflow-y-auto py-1">
                            {filteredCollaborators.length === 0 ? (
                              <p className="px-3 py-2 text-[12px] text-slate-400">
                                {collaboratorSearch.trim()
                                  ? "No matching collaborators"
                                  : "No collaborators available"}
                              </p>
                            ) : (
                              filteredCollaborators.map((owner) => (
                                <button
                                  key={owner}
                                  type="button"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    addCollaborator(owner);
                                    closeCollaboratorMenu();
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-violet-50"
                                >
                                  <span
                                    className={cn(
                                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                                      avatarColor(owner),
                                    )}
                                  >
                                    {initials(owner)}
                                  </span>
                                  <span className="truncate text-[13px] font-medium text-slate-800">
                                    {owner}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>,
                        document.body,
                      )
                    : null}
                </div>
              </div>
              {dueDate.trim() ? (
                <div className="space-y-1 border-t border-slate-100 pt-3">
                  <ReminderSettingsCard
                    enabled={reminderOn}
                    onEnabledChange={(on) => {
                      setReminderOn(on);
                      if (!on) {
                        setReminderDate("");
                        setReminderRepeat(turnOffReminderRepeat());
                      }
                    }}
                    reminderDate={reminderDate}
                    onReminderDateChange={setReminderDate}
                    min={minDueDate}
                    max={dueDate || undefined}
                    notifyBy={notifyBy}
                    onToggleNotify={toggleNotifyBy}
                    repeat={reminderRepeat}
                    onRepeatChange={setReminderRepeat}
                    due={due}
                  />
                  <TaskRepeatBlock
                    enabled={repeatOn}
                    onEnabledChange={(on) => {
                      setRepeatOn(on);
                      if (!on) setTaskRepeat(turnOffReminderRepeat());
                    }}
                    value={taskRepeat}
                    onChange={setTaskRepeat}
                    due={due}
                  />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (actionItems.length === 0) {
                    setActionItems([
                      { id: newActionItemId(), text: "", done: false },
                    ]);
                  }
                  setView("more");
                }}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                More Fields
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          ) : (
            <div key="more" className="animate-in fade-in-0 slide-in-from-right-2 space-y-3 duration-200">
              <div>
                <label className={labelClass}>Contact Name</label>
                <RelatedRecordCombobox
                  value={contactName}
                  onChange={setContactName}
                  options={contactOptions}
                  placeholder="Search contact…"
                  allowCustom
                />
              </div>
              <div>
                <label className={labelClass}>Related To</label>
                <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
                  <select
                    className={inputClass}
                    value={relatedKind}
                    onChange={(e) => {
                      const next = e.target.value as RelatedEntityKind;
                      setRelatedKind(next);
                      setRelatedName(next === "Lead" ? card.name : "");
                    }}
                  >
                    {RELATED_ENTITY_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                  <RelatedRecordCombobox
                    value={relatedName}
                    onChange={setRelatedName}
                    options={relatedOptions}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Task Type</label>
                  <select
                    className={inputClass}
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as TaskType)}
                  >
                    {TASK_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    className={inputClass}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  >
                    {TASK_STATUSES.filter(
                      (item) => item !== "Completed" && item !== "Cancelled",
                    ).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  rows={4}
                  className={cn(inputClass, "resize-none")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add context or instructions…"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
                  <ListChecks className="h-3.5 w-3.5" />
                  Action Items
                </div>
                <div className="space-y-1.5">
                  {actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-md border border-dashed border-slate-200 px-2.5 py-1.5"
                    >
                      <input
                        id={`lead-action-item-${item.id}`}
                        value={item.text}
                        onChange={(e) =>
                          setActionItems((prev) =>
                            prev.map((row) =>
                              row.id === item.id
                                ? { ...row, text: e.target.value }
                                : row,
                            ),
                          )
                        }
                        onBlur={() => dropBlankActionLine(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addActionLine(item.id);
                          }
                        }}
                        placeholder="Add action item…"
                        className="min-w-0 flex-1 bg-transparent text-[13px] focus:outline-none"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addActionLine(item.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-[#5A32A3]"
                        aria-label="Add action item"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <div className="mt-1.5">
                  <InlineTaskNoteComposer value={note} onChange={setNote} />
                  <div className="mt-3">
                    <AttachmentUpload files={attachments} onChange={setAttachments} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {error ? (
          <p className="px-5 pb-1 text-[12px] text-rose-600">{error}</p>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          {view === "more" ? (
            <button
              type="button"
              onClick={() => {
                pruneBlankActionItems();
                setView("main");
              }}
              className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold text-white"
              style={{ backgroundColor: PURPLE }}
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: PURPLE }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
