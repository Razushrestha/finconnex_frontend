"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  User,
  Calendar,
  Users,
  Link2,
} from "lucide-react";
import {
  TASK_OWNERS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  type Priority,
  type TaskStatus,
  type TaskType,
} from "@/lib/tasks/types";
import {
  RELATED_ENTITY_KINDS,
  RELATED_RECORD_OPTIONS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import { api } from "@/lib/api";
import {
  logCreate,
  notifyOwnerAssigned,
  notifyTaskDue,
  requireAction,
  requiredFieldErrors,
} from "@/lib/rules";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

interface CreateTaskFormProps {
  layoutId: string;
  redirect: boolean;
}

interface FormState {
  title: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  taskType: TaskType | "";
  priority: Priority | "";
  status: TaskStatus | "";
  dueDate: string;
  reminderDate: string;
  assignedTo: string;
  description: string;
  notes: string;
  collaborators: string;
}

const initialState: FormState = {
  title: "",
  relatedKind: "",
  relatedName: "",
  taskType: "Follow-up",
  priority: "Medium",
  status: "Not Started",
  dueDate: "",
  reminderDate: "",
  assignedTo: "John Smith",
  description: "",
  notes: "",
  collaborators: "",
};

export function CreateTaskForm({ layoutId, redirect }: CreateTaskFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const relatedOptions = form.relatedKind
    ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === form.relatedKind)
    : RELATED_RECORD_OPTIONS;

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {
      ...requiredFieldErrors(form as unknown as Record<string, unknown>, [
        "title",
        "taskType",
        "priority",
        "status",
        "dueDate",
        "assignedTo",
      ]),
    };
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    const gate = requireAction("activities.tasks.create");
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    const related =
      form.relatedKind && form.relatedName
        ? RELATED_RECORD_OPTIONS.find(
            (r) => r.kind === form.relatedKind && r.name === form.relatedName,
          )
        : undefined;
    const result = await api.tasks.create({
      title: form.title.trim(),
      taskType: form.taskType as TaskType,
      priority: form.priority as Priority,
      status: form.status as TaskStatus,
      dueDate: form.dueDate,
      assignedTo: form.assignedTo,
      relatedTo: related,
      description: form.description || undefined,
      notes: form.notes || undefined,
      collaborators: form.collaborators
        ? form.collaborators.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      createdBy: form.assignedTo,
    });
    if (!result.ok) {
      window.alert(result.error.message);
      return;
    }
    const task = result.data;
    logCreate("activities.tasks", form.assignedTo, task.taskId, form.title);
    notifyOwnerAssigned({
      owner: form.assignedTo,
      entityLabel: `Task ${form.title}`,
      relatedTo: form.title,
      relatedHref: "/activities/tasks",
      type: "Task Assigned",
    });
    notifyTaskDue({
      recipient: form.assignedTo,
      taskTitle: form.title,
      relatedTo: form.title,
      relatedHref: "/activities/tasks",
    });
    if (createAnother) {
      setForm({ ...initialState, assignedTo: form.assignedTo });
      setErrors({});
      setSubmitted(false);
      return;
    }
    router.push("/activities/tasks");
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Tasks", href: "/activities/tasks" }}
      badge="New task"
      title="Create Task"
      subtitle="Anything actionable becomes a task — assign an owner, due date, and priority."
      tip="Tip: Name, type, priority, status, due date & assignee are required."
      cardIcon={CheckSquare}
      cardTitle="Task Information"
      cardDescription="Fields marked required are needed to save (SRS §7.1)"
      listHref="/activities/tasks"
      saveLabel="Save Task"
      onSave={handleSave}
    >
      <Field
        label="Task Name"
        required
        error={submitted ? errors.title : undefined}
        className="sm:col-span-2 lg:col-span-3"
      >
        <InputShell
          icon={CheckSquare}
          error={!!(submitted && errors.title)}
        >
          <input
            className={elevatedInputClass(true)}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="What needs to be done?"
          />
        </InputShell>
      </Field>

      <Field label="Related Entity">
        <InputShell icon={Link2}>
          <select
            className={elevatedSelectClass(true)}
            value={form.relatedKind}
            onChange={(e) => {
              update("relatedKind", e.target.value as RelatedEntityKind | "");
              update("relatedName", "");
            }}
          >
            <option value="">None</option>
            {RELATED_ENTITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Related Record">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.relatedName}
            onChange={(e) => update("relatedName", e.target.value)}
            disabled={!form.relatedKind}
          >
            <option value="">Select record</option>
            {relatedOptions.map((r) => (
              <option key={`${r.kind}-${r.name}`} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Task Type"
        required
        error={submitted ? errors.taskType : undefined}
      >
        <InputShell error={!!(submitted && errors.taskType)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.taskType}
            onChange={(e) => update("taskType", e.target.value as TaskType)}
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Priority"
        required
        error={submitted ? errors.priority : undefined}
      >
        <InputShell error={!!(submitted && errors.priority)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.priority}
            onChange={(e) => update("priority", e.target.value as Priority)}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Status"
        required
        error={submitted ? errors.status : undefined}
      >
        <InputShell error={!!(submitted && errors.status)}>
          <select
            className={elevatedSelectClass(false)}
            value={form.status}
            onChange={(e) => update("status", e.target.value as TaskStatus)}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Due Date"
        required
        error={submitted ? errors.dueDate : undefined}
      >
        <InputShell
          icon={Calendar}
          error={!!(submitted && errors.dueDate)}
        >
          <input
            type="datetime-local"
            className={elevatedInputClass(true)}
            value={form.dueDate}
            onChange={(e) => update("dueDate", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Reminder Date">
        <InputShell icon={Calendar}>
          <input
            type="datetime-local"
            className={elevatedInputClass(true)}
            value={form.reminderDate}
            onChange={(e) => update("reminderDate", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field
        label="Assigned To"
        required
        error={submitted ? errors.assignedTo : undefined}
      >
        <InputShell icon={User} error={!!(submitted && errors.assignedTo)}>
          <select
            className={elevatedSelectClass(true)}
            value={form.assignedTo}
            onChange={(e) => update("assignedTo", e.target.value)}
          >
            {TASK_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Collaborators">
        <InputShell icon={Users}>
          <input
            className={elevatedInputClass(true)}
            value={form.collaborators}
            onChange={(e) => update("collaborators", e.target.value)}
            placeholder="Comma-separated names"
          />
        </InputShell>
      </Field>
      <Field label="Description" className="sm:col-span-2 lg:col-span-3">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Details, acceptance criteria…"
          />
        </TextAreaShell>
      </Field>
      <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
        <TextAreaShell>
          <textarea
            className={elevatedTextareaClass}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Internal notes…"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
