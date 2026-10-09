"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ListChecks,
  ChevronDown,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  formatTaskTimestamp,
  notifyToMethod,
  type Priority,
  type ReminderNotifyOption,
  type TaskActionItem,
  type TaskStatus,
  type TaskType,
} from "@/lib/tasks/types";
import { avatarColor, type RelatedEntityKind } from "@/lib/activities/shared";
import {
  TASK_RELATED_ENTITY_KINDS,
  liveRelatedRecords,
  rankRelatedRecordsByContact,
} from "@/lib/activities/related-records";
import {
  createCrmTask,
  persistRemoteTask,
} from "@/lib/tasks/api";
import {
  createTask,
  deleteTask,
  findTaskById,
} from "@/lib/tasks/store";
import { isUuid } from "@/lib/activity-timeline/auth";
import { listCrmCompanies, tryCrmCompany } from "@/lib/companies/api";
import { mergeCrmCompaniesIntoBoard } from "@/lib/companies/store";
import { listCrmContacts, tryCrmContact } from "@/lib/contacts/api";
import { mergeCrmContactsIntoBoard } from "@/lib/contacts/store";
import { listCrmDeals, tryCrmDeal } from "@/lib/deals/api";
import { mergeCrmDealsIntoBoard } from "@/lib/deals/store";
import { fetchLeadList } from "@/lib/leads/api";
import { mapCrmLeadToCard } from "@/lib/leads/api/map";
import { upsertLeadFromCard } from "@/lib/leads/store";
import type { RelatedTo } from "@/lib/activities/shared";
import {
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
  resolveAssignableOwnerName,
  resolveCrmAssigneeUserId,
  type AssignableOwner,
} from "@/lib/users/assignable";
import {
  logCreate,
  notifyOwnerAssigned,
  notifyTaskDue,
  requireAction,
  requiredFieldErrors,
} from "@/lib/rules";
import { getRulesActor } from "@/lib/rules/actor";
import RelatedRecordCombobox from "./RelatedRecordComboBox";
import { ContactNameCombobox } from "@/components/shared/ContactNameCombobox";
import {
  ReminderSettingsCard,
  TaskRepeatBlock,
  turnOffReminderRepeat,
} from "./ReminderSettingsCard";
import { TaskAuditCard } from "@/components/activities/tasks/TaskAuditCard";
import {
  elevatedTextareaClass,
  Field,
  TextAreaShell,
} from "@/components/sales/CreateEntityForm";
import { WorkQueueNotesDrawer } from "@/components/work-queue/WorkQueueNotesDrawer";
import { listNotesForQueueRow, relinkNotesRelated } from "@/lib/notes/store";
import { type NotificationMethod } from "@/lib/reminders/types";
import {
  defaultReminderRepeatRule,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import { buildRemindersFromSchedule } from "@/lib/tasks/reminder-series";
import { toast } from "@/lib/notify/toast";

interface CreateTaskFormProps {
  layoutId: string;
  redirect: boolean;
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
    dueDate?: string;
  };
}

interface FormState {
  title: string;
  contactName: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  taskType: TaskType | "";
  priority: Priority | "";
  status: TaskStatus | "";
  dueDate: string;
  reminderDate: string;
  assignedTo: string;
  description: string;
  collaborators: string[];
  actionItems: TaskActionItem[];
  notifyBy: NotificationMethod[];
  taskRepeat: ReminderRepeatRule;
  reminderRepeat: ReminderRepeatRule;
}

const initialState: FormState = {
  title: "",
  contactName: "",
  relatedKind: "",
  relatedName: "",
  taskType: "Follow-up",
  priority: "Medium",
  status: "Not Started",
  dueDate: "",
  reminderDate: "",
  assignedTo: defaultAssignableOwnerId(listAssignableOwnersLocal()),
  description: "",
  collaborators: [],
  actionItems: [],
  notifyBy: ["Email"],
  taskRepeat: defaultReminderRepeatRule,
  reminderRepeat: defaultReminderRepeatRule,
};

// Only Task Subject is required before the task can be saved.
const REQUIRED_FIELDS = ["title"] as const;

function newTaskNoteKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `task-draft:${crypto.randomUUID()}`
    : `task-draft:${Date.now()}`;
}
const TASK_SUBJECT_MAX = 150;
const MAX_COLLABORATORS = 3;

function collaboratorAddLabel(count: number) {
  const nextSlot = count + 1;
  if (nextSlot === 1) return "Add 1st collaborator";
  if (nextSlot === 2) return "Add 2nd collaborator";
  if (nextSlot === 3) return "Add 3rd collaborator";
  return `Add collaborator ${nextSlot}`;
}

function matchesPersonQuery(owner: AssignableOwner, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    owner.name.toLowerCase().includes(q) ||
    owner.email.toLowerCase().includes(q)
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function PersonSearchMenu({
  query,
  onQueryChange,
  placeholder,
  people,
  emptyQuery,
  emptyLabel,
  idleLabel,
  onPick,
  className = "w-full",
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  people: AssignableOwner[];
  emptyQuery: string;
  emptyLabel: string;
  idleLabel: string;
  onPick: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={`absolute top-full left-0 z-30 mt-1 min-w-[280px] rounded-lg border border-gray-200 bg-white shadow-lg ${className}`}
    >
      <div className="border-b border-gray-100 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full rounded-md border border-gray-200 py-1.5 pr-2 pl-8 text-sm text-gray-700 placeholder:text-gray-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </div>
      <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
        {people.length > 0 ? (
          people.map((owner) => (
            <li key={owner.id}>
              <button
                type="button"
                role="option"
                onClick={() => onPick(owner.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-violet-50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                  {initials(owner.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-gray-800">
                    {owner.name}
                  </span>
                  {owner.email ? (
                    <span className="block truncate text-[11px] text-gray-400">
                      {owner.email}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))
        ) : (
          <li className="px-3 py-2 text-sm text-gray-400">
            {emptyQuery.trim() ? emptyLabel : idleLabel}
          </li>
        )}
      </ul>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 placeholder:text-foreground/50 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100";
const selectClass = inputClass + " appearance-none";
const labelClass =
  "text-[11px] font-medium uppercase tracking-wide text-gray-500";

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
  methods: NotificationMethod[],
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

function validateTaskDates(
  dueDate: string,
  reminderDate: string,
): Partial<Record<"dueDate" | "reminderDate", string>> {
  const errors: Partial<Record<"dueDate" | "reminderDate", string>> = {};
  const now = startOfMinute(new Date());
  const due = parseDatetimeLocal(dueDate);

  if (dueDate.trim()) {
    if (!due) {
      errors.dueDate = "Enter a valid due date and time";
    } else if (due.getTime() < now.getTime()) {
      errors.dueDate = "Due date cannot be before the current date and time";
    }
  }

  if (reminderDate.trim()) {
    const reminder = parseDatetimeLocal(reminderDate);
    if (!reminder) {
      errors.reminderDate = "Enter a valid reminder date and time";
    } else if (due && reminder.getTime() > due.getTime()) {
      errors.reminderDate = "Reminder cannot be after the due date";
    } else if (reminder.getTime() <= now.getTime()) {
      errors.reminderDate =
        "Reminder must be after the current date and time";
    }
  }

  return errors;
}

function ownerDisplay(options: AssignableOwner[], id: string) {
  const owner = options.find((row) => row.id === id);
  return owner?.name || resolveAssignableOwnerName(id);
}

function newActionItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formFromDefaults(
  defaults?: CreateTaskFormProps["defaults"],
): FormState {
  const kind = defaults?.relatedKind ?? "";
  const name = defaults?.relatedName ?? "";
  const dueDate = defaults?.dueDate ?? "";
  const relatedKind =
    kind === "Contact" || kind === "Lead" || kind === "Deal" || kind === "Company"
      ? kind
      : "";
  return {
    ...initialState,
    contactName: kind === "Contact" ? name : "",
    relatedKind,
    relatedName: relatedKind ? name : "",
    dueDate,
  };
}

export function CreateTaskForm({
  layoutId,
  redirect,
  defaults,
}: CreateTaskFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => formFromDefaults(defaults));
  const [noteKey, setNoteKey] = useState(newTaskNoteKey);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteTick, setNoteTick] = useState(0);
  const taskNoteCount = useMemo(
    () =>
      listNotesForQueueRow({
        subject: form.title.trim() || "New task",
        noteKey,
      }).length,
    [form.title, noteKey, noteTick],
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);
  const [newActionItem, setNewActionItem] = useState("");
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");
  const newActionItemRef = useRef<HTMLInputElement>(null);
  const collaboratorPickerRef = useRef<HTMLDivElement>(null);
  const ownerPickerRef = useRef<HTMLDivElement>(null);
  const [ownerOptions, setOwnerOptions] = useState<AssignableOwner[]>(() =>
    listAssignableOwnersLocal(),
  );
  const [extraRelated, setExtraRelated] = useState<RelatedTo[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((rows) => {
      if (cancelled || !rows.length) return;
      setOwnerOptions(rows);
      setForm((prev) => ({
        ...prev,
        assignedTo: defaultAssignableOwnerId(rows, prev.assignedTo),
      }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const kind = form.relatedKind;
    if (!kind) {
      setExtraRelated([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const rows: RelatedTo[] = [];
      if (kind === "Company") {
        const remote = await tryCrmCompany(() =>
          listCrmCompanies({ limit: 100 }),
        );
        if (remote?.length) {
          mergeCrmCompaniesIntoBoard(remote);
          for (const item of remote) {
            rows.push({
              kind: "Company",
              name: item.company.name,
              id: item.company.id,
            });
          }
        }
      } else if (kind === "Contact") {
        const remote = await tryCrmContact(() =>
          listCrmContacts({ limit: 100 }),
        );
        if (remote?.length) {
          mergeCrmContactsIntoBoard(remote);
          for (const item of remote) {
            rows.push({
              kind: "Contact",
              name: item.contact.name,
              id: item.contact.id,
            });
          }
        }
      } else if (kind === "Deal") {
        const remote = await tryCrmDeal(() => listCrmDeals({ limit: 100 }));
        if (remote?.length) {
          mergeCrmDealsIntoBoard(remote);
          for (const item of remote) {
            rows.push({ kind: "Deal", name: item.name, id: item.id });
          }
        }
      } else if (kind === "Lead") {
        try {
          const remote = await fetchLeadList({ limit: 100 });
          for (const lead of remote) {
            const card = mapCrmLeadToCard(lead);
            upsertLeadFromCard(card);
            rows.push({ kind: "Lead", name: card.name, id: card.id });
          }
        } catch {
          /* keep local picker */
        }
      }
      if (!cancelled) setExtraRelated(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [form.relatedKind]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function syncDateErrors(nextDueDate: string, nextReminderDate: string) {
    const dateErrors = validateTaskDates(nextDueDate, nextReminderDate);
    setErrors((prev) => {
      const next = { ...prev };
      if (dateErrors.dueDate) {
        next.dueDate = dateErrors.dueDate;
      } else if (nextDueDate.trim()) {
        delete next.dueDate;
      }
      if (dateErrors.reminderDate) {
        next.reminderDate = dateErrors.reminderDate;
      } else {
        delete next.reminderDate;
      }
      return next;
    });
  }

  function handleDueDateChange(value: string) {
    let nextReminder = form.reminderDate;
    if (!value.trim()) {
      nextReminder = "";
      setReminderOn(false);
      setRepeatOn(false);
    } else {
      const due = parseDatetimeLocal(value);
      const reminder = parseDatetimeLocal(nextReminder);
      if (due && reminder && reminder.getTime() > due.getTime()) {
        nextReminder = "";
      }
    }
    setForm((prev) => ({
      ...prev,
      dueDate: value,
      reminderDate: nextReminder,
      reminderRepeat:
        nextReminder.trim() || prev.reminderRepeat.preset !== "afterCompletion"
          ? prev.reminderRepeat
          : defaultReminderRepeatRule,
      taskRepeat: value.trim() ? prev.taskRepeat : defaultReminderRepeatRule,
    }));
    syncDateErrors(value, nextReminder);
  }

  function handleReminderDateChange(value: string) {
    setForm((prev) => ({
      ...prev,
      reminderDate: value,
      reminderRepeat:
        value.trim() || prev.reminderRepeat.preset !== "afterCompletion"
          ? prev.reminderRepeat
          : defaultReminderRepeatRule,
    }));
    syncDateErrors(form.dueDate, value);
  }

  function toggleNotifyBy(method: NotificationMethod) {
    setForm((prev) => {
      const selected = prev.notifyBy.includes(method);
      return {
        ...prev,
        notifyBy: selected
          ? prev.notifyBy.filter((item) => item !== method)
          : [...prev.notifyBy, method],
      };
    });
  }

  const minDueDate = toDatetimeLocalValue(startOfMinute(new Date()));
  const minReminderDate = minDueDate;
  const hasDueDate = Boolean(form.dueDate.trim());

  const relatedOptions = rankRelatedRecordsByContact(
    [
      ...extraRelated,
      ...liveRelatedRecords(
        form.relatedKind,
        form.relatedKind && form.relatedName
          ? { kind: form.relatedKind as RelatedEntityKind, name: form.relatedName }
          : undefined,
      ),
    ].filter((item, index, list) => {
      const key = `${item.kind}:${(item.id || item.name).toLowerCase()}`;
      return (
        list.findIndex(
          (row) => `${row.kind}:${(row.id || row.name).toLowerCase()}` === key,
        ) === index
      );
    }),
    form.contactName,
  );

  const actor =
    getRulesActor().name ||
    ownerDisplay(ownerOptions, form.assignedTo) ||
    "Admin";
  const auditPreviewOn = formatTaskTimestamp(new Date());

  useEffect(() => {
    if (!addingCollaborator && !ownerPickerOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        collaboratorPickerRef.current &&
        !collaboratorPickerRef.current.contains(target)
      ) {
        setAddingCollaborator(false);
        setCollaboratorSearch("");
      }
      if (ownerPickerRef.current && !ownerPickerRef.current.contains(target)) {
        setOwnerPickerOpen(false);
        setOwnerSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [addingCollaborator, ownerPickerOpen]);

  const availableCollaborators = ownerOptions.filter(
    (owner) =>
      owner.id !== form.assignedTo && !form.collaborators.includes(owner.id),
  );
  const filteredCollaborators = availableCollaborators.filter((owner) =>
    matchesPersonQuery(owner, collaboratorSearch),
  );
  const filteredOwners = ownerOptions.filter((owner) =>
    matchesPersonQuery(owner, ownerSearch),
  );

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {
      ...requiredFieldErrors(
        form as unknown as Record<string, unknown>,
        REQUIRED_FIELDS as unknown as string[],
      ),
      ...validateTaskDates(form.dueDate, form.reminderDate),
    };
    if (next.title) {
      next.title = "Task Subject is required";
    } else if (form.title.trim().length > TASK_SUBJECT_MAX) {
      next.title = `Task Subject must be ${TASK_SUBJECT_MAX} characters or fewer`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function addActionItem(options?: { focusAfter?: boolean }) {
    const text = newActionItem.trim();
    if (!text) {
      if (options?.focusAfter) newActionItemRef.current?.focus();
      return;
    }
    setForm((prev) => ({
      ...prev,
      actionItems: [
        ...prev.actionItems,
        { id: newActionItemId(), text, done: false },
      ],
    }));
    setNewActionItem("");
    if (options?.focusAfter) {
      requestAnimationFrame(() => newActionItemRef.current?.focus());
    }
  }

  function toggleActionItem(id: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    }));
  }

  function updateActionItemText(id: string, text: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) =>
        item.id === id ? { ...item, text } : item,
      ),
    }));
  }

  function finalizeActionItemText(id: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter(
        (item) => item.id !== id || item.text.trim().length > 0,
      ),
    }));
  }

  function removeActionItem(id: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter((item) => item.id !== id),
    }));
  }

  function addCollaborator(userId: string) {
    if (
      !userId ||
      form.collaborators.includes(userId) ||
      userId === form.assignedTo ||
      form.collaborators.length >= MAX_COLLABORATORS
    ) {
      return;
    }
    update("collaborators", [...form.collaborators, userId]);
    setCollaboratorSearch("");
    setAddingCollaborator(false);
  }

  const canAddCollaborator = form.collaborators.length < MAX_COLLABORATORS;
  const addCollaboratorLabel = collaboratorAddLabel(form.collaborators.length);

  function removeCollaborator(userId: string) {
    update(
      "collaborators",
      form.collaborators.filter((id) => id !== userId),
    );
  }

  const completedCount = form.actionItems.filter((i) => i.done).length;

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    const gate = requireAction("activities.tasks.create");
    if (!gate.ok) {
      toast.error(gate.message);
      return;
    }
    const pendingAction = newActionItem.trim();
    const actionItems = [
      ...form.actionItems.filter((item) => item.text.trim().length > 0),
      ...(pendingAction
        ? [{ id: newActionItemId(), text: pendingAction, done: false }]
        : []),
    ];
    const relatedMatch =
      form.relatedKind && form.relatedName
        ? relatedOptions.find(
            (item) =>
              item.kind === form.relatedKind && item.name === form.relatedName,
          )
        : undefined;
    const related =
      form.relatedKind && form.relatedName
        ? {
            kind: form.relatedKind as RelatedEntityKind,
            name: form.relatedName,
            id: relatedMatch?.id,
          }
        : form.contactName.trim()
          ? { kind: "Contact" as const, name: form.contactName.trim() }
          : undefined;
    const ownerName = ownerDisplay(ownerOptions, form.assignedTo) || form.assignedTo;
    const assigneeUserId = await resolveCrmAssigneeUserId(form.assignedTo);
    if (!assigneeUserId) {
      toast.error(
        "Could not find a workspace member to assign. Sign in, then pick a Task Owner.",
      );
      return;
    }
    const collaboratorNames = form.collaborators
      .map((id) => ownerDisplay(ownerOptions, id))
      .filter(Boolean);

    const repeatPreset = form.taskRepeat.preset;
    const repeatEvery =
      repeatOn &&
      (repeatPreset === "daily" ||
        repeatPreset === "weekly" ||
        repeatPreset === "monthly" ||
        repeatPreset === "yearly")
        ? (repeatPreset.toUpperCase() as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY")
        : undefined;

    const draft = {
      title: form.title.trim(),
      taskType: form.taskType as TaskType,
      priority: form.priority as Priority,
      status: form.status as TaskStatus,
      dueDate: formatStoredTaskDateTime(form.dueDate),
      reminderDate:
        reminderOn && form.reminderDate.trim()
          ? formatStoredTaskDateTime(form.reminderDate)
          : undefined,
      reminders:
        reminderOn && form.reminderDate.trim()
          ? remindersFromForm(
              form.reminderDate,
              form.notifyBy,
              form.reminderRepeat,
              form.dueDate,
            )
          : undefined,
      assignedTo: assigneeUserId,
      relatedTo: related,
      relatedId: related?.id && isUuid(related.id) ? related.id : undefined,
      description: form.description || undefined,
      collaborators: form.collaborators.length ? form.collaborators : undefined,
      actionItems: actionItems.length ? actionItems : undefined,
      notifyBy:
        reminderOn && form.reminderDate.trim() && form.notifyBy.length
          ? form.notifyBy
          : undefined,
      repeatRule:
        repeatOn && form.taskRepeat.preset !== "none"
          ? form.taskRepeat
          : undefined,
      repeatEvery,
      createdBy: actor,
    };
    const local = createTask({
      ...draft,
      assignedTo: ownerName,
      collaborators: collaboratorNames.length ? collaboratorNames : undefined,
    });
    let task = local;
    try {
      const remote = await createCrmTask(draft);
      if (remote && remote.taskId !== local.taskId) {
        deleteTask(local.taskId);
        persistRemoteTask({
          ...local,
          ...remote,
          assignedTo: ownerName || remote.assignedTo,
          collaborators: collaboratorNames.length
            ? collaboratorNames
            : remote.collaborators,
          relatedTo: related ?? remote.relatedTo,
          description: local.description ?? remote.description,
          notes: local.notes ?? remote.notes,
          dueDate: draft.dueDate.trim()
            ? remote.dueDate || local.dueDate
            : "",
          activityNotes: local.activityNotes,
          reminders: local.reminders,
          actionItems: local.actionItems,
          notifyBy: local.notifyBy,
          repeatRule: local.repeatRule,
        });
        task = findTaskById(remote.taskId)?.task ?? remote;
      } else if (!remote) {
        deleteTask(local.taskId);
        toast.error("CRM did not return the new task. Please try again.");
        return;
      }
    } catch (err) {
      deleteTask(local.taskId);
      toast.error(
        err instanceof Error ? err.message : "Could not save this task to CRM.",
      );
      return;
    }
    relinkNotesRelated(noteKey, {
      relatedTo: task.title,
      relatedId: task.taskId,
      relatedType: "Task",
    });
    logCreate("activities.tasks", ownerName, task.taskId, form.title);
    notifyOwnerAssigned({
      owner: ownerName,
      entityLabel: `Task ${form.title}`,
      relatedTo: form.title,
      relatedHref: "/activities/tasks",
      type: "Task Assigned",
    });
    notifyTaskDue({
      recipient: ownerName,
      taskTitle: form.title,
      relatedTo: form.title,
      relatedHref: "/activities/tasks",
    });
    if (createAnother) {
      setNoteKey(newTaskNoteKey());
      setForm({ ...initialState, assignedTo: form.assignedTo });
      setErrors({});
      setSubmitted(false);
      setNewActionItem("");
      setRepeatOn(false);
      setReminderOn(false);
      return;
    }
    void layoutId;
    void redirect;
    router.push(`/activities/tasks?focus=${task.taskId}`);
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <h1 className="text-base font-semibold text-foreground">
          Create New Task
          </h1>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/activities/tasks")}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            <ChevronLeft className="hidden h-4 w-4" />
            Save Task
          </button>
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-4 px-4 py-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:gap-6 2xl:px-8">
        {/* Left column */}
        <div className="space-y-6">
          {/* Task info card */}
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-1">
              <label className={labelClass}>
                Task Subject <span className="text-red-500">*</span>
              </label>
            <input
                className={
                  inputClass +
                  (submitted && errors.title ? " border-red-300" : "")
                }
                value={form.title}
                maxLength={TASK_SUBJECT_MAX}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g., Follow up on Q3 Proposal"
              />
              <p className="mt-1 text-[10px] text-slate-400 tabular-nums">
                {form.title.length}/{TASK_SUBJECT_MAX}
              </p>
              {submitted && errors.title && (
                <p className="mt-1 text-xs text-red-500">{errors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Task Type</label>
                <select
                  className={
                    selectClass +
                    (submitted && errors.taskType ? " border-red-300" : "")
                  }
                  value={form.taskType}
                  onChange={(e) =>
                    update("taskType", e.target.value as TaskType)
                  }
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Contact Name</label>
                <ContactNameCombobox
                  value={form.contactName}
                  onChange={(v) => update("contactName", v)}
                  placeholder="Add contact"
                  addLabel="Add contact"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Related Entity</label>
                <select
                  className={selectClass}
                  value={form.relatedKind}
                  onChange={(e) => {
                    update(
                      "relatedKind",
                      e.target.value as RelatedEntityKind | "",
                    );
                    update("relatedName", "");
                  }}
                >
                  <option value="">None</option>
                  {TASK_RELATED_ENTITY_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Related Record</label>
                <RelatedRecordCombobox
                  value={form.relatedName}
                  onChange={(v) => update("relatedName", v)}
                  options={relatedOptions}
                  disabled={!form.relatedKind}
                  placeholder={
                    form.relatedKind
                      ? `Search ${form.relatedKind.toLowerCase()}…`
                      : "Select related entity first"
                  }
                />
              </div>
            </div>

            <div className="mt-5 w-full">
              <label className={labelClass}>Task Description</label>
              <div className="mt-1 w-full">
                <TextAreaShell>
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Provide detailed context or instructions…"
                    rows={5}
                    className={elevatedTextareaClass}
                  />
                </TextAreaShell>
              </div>
            </div>
          </div>

          {/* Action items card */}
          <div className="rounded-md border border-border bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                <ListChecks className="h-4 w-4 text-foreground/70" />
                Action Items
              </div>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground/75">
                {completedCount}/{form.actionItems.length} Completed
              </span>
            </div>

            {form.actionItems.length > 0 && (
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all duration-300"
                  style={{
                    width: `${
                      form.actionItems.length
                        ? (completedCount / form.actionItems.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              {form.actionItems.length === 0 ? (
                <p className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-400">
                  No action items yet. Add your first step below.
                </p>
              ) : (
                form.actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2.5 rounded-md border border-gray-100 bg-white px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleActionItem(item.id)}
                      className="h-4 w-4 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-violet-400"
                      aria-label={`Mark "${item.text}" complete`}
                    />
          <input
            type="text"
                      value={item.text}
                      onChange={(e) =>
                        updateActionItemText(item.id, e.target.value)
                      }
                      onBlur={() => finalizeActionItemText(item.id)}
                      className={
                        "min-w-0 flex-1 bg-transparent text-sm focus:outline-none " +
                        (item.done
                          ? "text-foreground/50 line-through"
                          : "text-foreground/80")
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeActionItem(item.id)}
                      className="shrink-0 text-gray-400 opacity-100 transition-opacity hover:text-gray-600 md:opacity-0 md:group-hover:opacity-100"
                      aria-label={`Remove "${item.text}"`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}

              <div className="flex items-center gap-2.5 rounded-md border border-dashed border-gray-200 px-3 py-2 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
                <Plus className="h-4 w-4 shrink-0 text-gray-400" />
            <input
                  ref={newActionItemRef}
                  value={newActionItem}
                  onChange={(e) => setNewActionItem(e.target.value)}
                  onBlur={() => addActionItem()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addActionItem({ focusAfter: true });
                    }
                  }}
                  placeholder="Add new action item…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => addActionItem({ focusAfter: true })}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-violet-700 transition-colors hover:text-violet-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          <button
            type="button"
            onClick={() => setNotesOpen((open) => !open)}
            className="flex h-11 w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-left text-[14px] text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <span>Notes</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
              {taskNoteCount}
            </span>
          </button>
          {notesOpen ? (
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              <WorkQueueNotesDrawer
                key={noteKey}
                inlineComposer
                row={{
                  id: noteKey,
                  subject: form.title.trim() || "New task",
                  href: "/activities/tasks",
                  noteKey,
                }}
                onClose={() => setNotesOpen(false)}
                onChanged={(message) => {
                  setNoteTick((n) => n + 1);
                  toast.success(message);
                }}
              />
            </div>
          ) : null}
          </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Owner + collaborators — same card, separate sections */}
          <div className="space-y-4 rounded-xl border border-border bg-white p-4 shadow-sm">
            <div>
                <label className={labelClass}>Task Owner</label>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {form.assignedTo ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2 text-sm text-gray-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
                      {initials(ownerDisplay(ownerOptions, form.assignedTo))}
                    </span>
                    {ownerDisplay(ownerOptions, form.assignedTo)}
                    <button
                      type="button"
                      onClick={() => update("assignedTo", "")}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label={`Remove ${ownerDisplay(ownerOptions, form.assignedTo)}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  <div ref={ownerPickerRef} className="relative w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setOwnerPickerOpen((open) => !open);
                        if (ownerPickerOpen) setOwnerSearch("");
                      }}
                      className={`${inputClass} relative flex items-center gap-2 pl-9 text-left text-gray-400 ${
                        submitted && errors.assignedTo ? "border-red-300" : ""
                      }`}
                      aria-haspopup="listbox"
                      aria-expanded={ownerPickerOpen}
                    >
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      Select an owner
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
                    </button>
                    {ownerPickerOpen ? (
                      <PersonSearchMenu
                        query={ownerSearch}
                        onQueryChange={setOwnerSearch}
                        placeholder="Search owners…"
                        people={filteredOwners}
                        emptyQuery={ownerSearch}
                        emptyLabel="No owners match your search"
                        idleLabel="No owners available"
                        onPick={(id) => {
                          update("assignedTo", id);
                          setOwnerPickerOpen(false);
                          setOwnerSearch("");
                        }}
                      />
                    ) : null}
                  </div>
                )}
              </div>
              {submitted && errors.assignedTo && (
                <p className="mt-1 text-xs text-red-500">{errors.assignedTo}</p>
              )}
            </div>

            <div className="relative z-20 overflow-visible border-t border-border pt-4">
              <label className={labelClass}>Collaborators</label>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {form.collaborators.map((userId) => (
                  <span
                    key={userId}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2 text-sm text-gray-700"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700">
                      {initials(ownerDisplay(ownerOptions, userId))}
                    </span>
                    {ownerDisplay(ownerOptions, userId)}
                    <button
                      type="button"
                      onClick={() => removeCollaborator(userId)}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label={`Remove collaborator ${ownerDisplay(ownerOptions, userId)}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}

                {canAddCollaborator ? (
                <div ref={collaboratorPickerRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCollaborator((open) => !open);
                      if (addingCollaborator) setCollaboratorSearch("");
                    }}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed transition-colors ${
                      addingCollaborator
                        ? "border-violet-300 bg-violet-50 text-violet-700"
                        : "border-gray-300 text-gray-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                    }`}
                    aria-label={addCollaboratorLabel}
                    title={addCollaboratorLabel}
                    aria-expanded={addingCollaborator}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {addingCollaborator && (
                    <PersonSearchMenu
                      query={collaboratorSearch}
                      onQueryChange={setCollaboratorSearch}
                      placeholder="Search collaborators…"
                      people={filteredCollaborators}
                      emptyQuery={collaboratorSearch}
                      emptyLabel="No collaborators match your search"
                      idleLabel="No collaborators available"
                      onPick={(id) => addCollaborator(id)}
                      className="w-72"
                    />
                  )}
                </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Status / scheduling card */}
          <div className="space-y-4 rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Status</label>
          <select
                  className={
                    selectClass +
                    (submitted && errors.status ? " border-red-300" : "")
                  }
            value={form.status}
                  onChange={(e) =>
                    update("status", e.target.value as TaskStatus)
                  }
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
          </select>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
          <select
                  className={
                    selectClass +
                    (submitted && errors.priority ? " border-red-300" : "")
                  }
            value={form.priority}
                  onChange={(e) =>
                    update("priority", e.target.value as Priority)
                  }
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
          </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Due Date</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="datetime-local"
                  min={minDueDate}
                  className={
                    inputClass +
                    " pl-9" +
                    (form.dueDate
                      ? ""
                      : " text-transparent [&::-webkit-datetime-edit]:text-transparent") +
                    (submitted && errors.dueDate ? " border-red-300" : "")
                  }
                  value={form.dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                />
                {form.dueDate ? null : (
                  <span className="pointer-events-none absolute top-1/2 left-9 -translate-y-1/2 text-sm text-gray-400">
                    Select due date
                  </span>
                )}
              </div>
              {(submitted || form.dueDate) && errors.dueDate ? (
                <p className="mt-1 text-xs text-red-600">{errors.dueDate}</p>
              ) : null}
            </div>

            {hasDueDate ? (
              <TaskRepeatBlock
                enabled={repeatOn}
                onEnabledChange={(on) => {
                  setRepeatOn(on);
                  if (!on) update("taskRepeat", turnOffReminderRepeat());
                }}
                value={form.taskRepeat}
                onChange={(taskRepeat) => update("taskRepeat", taskRepeat)}
                due={parseDatetimeLocal(form.dueDate)}
              />
            ) : null}

            {hasDueDate ? (
              <ReminderSettingsCard
                enabled={reminderOn}
                onEnabledChange={(on) => {
                  setReminderOn(on);
                  if (!on) {
                    handleReminderDateChange("");
                    update("reminderRepeat", turnOffReminderRepeat());
                  }
                }}
                reminderDate={form.reminderDate}
                onReminderDateChange={handleReminderDateChange}
                min={minReminderDate}
                max={form.dueDate}
                error={
                  submitted || form.reminderDate
                    ? errors.reminderDate
                    : undefined
                }
                notifyBy={form.notifyBy}
                onToggleNotify={toggleNotifyBy}
                repeat={form.reminderRepeat}
                onRepeatChange={(reminderRepeat) =>
                  update("reminderRepeat", reminderRepeat)
                }
                due={parseDatetimeLocal(form.dueDate)}
              />
            ) : null}

          </div>

          <TaskAuditCard
            createdBy={actor}
            createdOn={auditPreviewOn}
            modifiedBy={actor}
            modifiedOn={auditPreviewOn}
          />
        </div>
      </div>
    </div>
  );
}
