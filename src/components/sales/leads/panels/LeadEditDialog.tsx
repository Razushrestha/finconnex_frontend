"use client";

import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import type { Priority } from "@/lib/tasks/types";
import { listTaskColumns, createTask } from "@/lib/tasks/store";
import { listMeetings, createMeeting } from "@/lib/meetings/store";
import { listNotes, createNote } from "@/lib/notes/store";
import { findLeadById, listLeadColumns } from "@/lib/leads/store";
import { leadApplicants } from "@/lib/leads/detail-snapshot";
import type { LeadCardData } from "@/lib/leads/types";
import {
  hrefForLeadActivity,
  listLeadActivityCandidates,
  relatedMatchesLead,
} from "@/lib/leads/activity-index";
import { listAttachments } from "@/lib/attachments/store";
import { listLibraryDocuments } from "@/lib/documents/library/types";
import { getRulesActor } from "@/lib/rules/actor";
import {
  X,
  Plus,
  Search,
  ListFilter,
  ArrowUpDown,
  StickyNote,
  Paperclip,
  CheckSquare,
  CalendarDays,
  History,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SectionId = "appointment" | "detail" | "tasks" | "notes" | "associated";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "detail", label: "Lead Details" },
  { id: "appointment", label: "Meetings" },
  { id: "tasks", label: "Tasks" },
  { id: "notes", label: "Notes" },
  { id: "associated", label: "Attachments" },
];

interface TaskEntry {
  id: string;
  title: string;
  dueLabel: string;
  status: "Open" | "Done";
  priority: Priority;
  assignedTo: string;
  previous?: boolean;
}

interface NoteEntry {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  owner: string;
}

interface AppointmentEntry {
  id: string;
  title: string;
  whenLabel: string;
  status: string;
  location?: string;
  previous?: boolean;
}


interface ActionEntry {
  id: string;
  title: string;
  kind: string;
  whenLabel: string;
  bucket: "pending" | "completed";
  href?: string | null;
}

function matchesLead(related: string | undefined, leadName: string): boolean {
  if (!related?.trim()) return false;
  const needle = leadName.trim().toLowerCase();
  return related.toLowerCase().includes(needle);
}

function seedPreviousTasks(leadName: string): TaskEntry[] {
  return [
    {
      id: `prev-task-1-${leadName}`,
      title: "Send welcome pack",
      dueLabel: "Completed Jul 18",
      status: "Done",
      priority: "Medium",
      assignedTo: "John Smith",
      previous: true,
    },
    {
      id: `prev-task-2-${leadName}`,
      title: "Confirm documents checklist",
      dueLabel: "Completed Jul 12",
      status: "Done",
      priority: "High",
      assignedTo: "Priya Shrestha",
      previous: true,
    },
  ];
}

function seedPreviousAppointments(leadName: string): AppointmentEntry[] {
  return [
    {
      id: `prev-appt-1-${leadName}`,
      title: "Discovery call",
      whenLabel: "Jul 15, 2026 · 10:00 AM",
      status: "Completed",
      location: "Zoom",
      previous: true,
    },
    {
      id: `prev-appt-2-${leadName}`,
      title: "Rate review meeting",
      whenLabel: "Jul 8, 2026 · 2:30 PM",
      status: "Completed",
      location: "Office",
      previous: true,
    },
  ];
}

function loadLeadTasks(leadName: string): TaskEntry[] {
  const open: TaskEntry[] = [];
  const done: TaskEntry[] = [];
  for (const col of listTaskColumns()) {
    for (const t of col.tasks) {
      if (t.relatedTo?.kind !== "Lead") continue;
      if (!matchesLead(t.relatedTo.name, leadName)) continue;
      const entry: TaskEntry = {
        id: t.taskId,
        title: t.title,
        dueLabel: t.completedDate
          ? `Completed ${t.completedDate}`
          : t.dueDate || "No due date",
        status: t.status === "Completed" ? "Done" : "Open",
        priority: t.priority,
        assignedTo: t.assignedTo,
        previous: t.status === "Completed",
      };
      if (entry.status === "Done") done.push(entry);
      else open.push(entry);
    }
  }
  const previous = done.length > 0 ? done : seedPreviousTasks(leadName);
  return [...open, ...previous];
}

function loadLeadAppointments(leadName: string): AppointmentEntry[] {
  const fromStore: AppointmentEntry[] = listMeetings()
    .filter((m) => matchesLead(m.relatedTo, leadName))
    .map((m) => ({
      id: m.id,
      title: m.title,
      whenLabel: m.startDateTime || "No date",
      status: m.status,
      location: m.location,
      previous:
        m.status === "Completed" ||
        m.status === "Cancelled" ||
        Boolean(m.startDateTime && new Date(m.startDateTime) < new Date()),
    }));

  if (fromStore.length === 0) return seedPreviousAppointments(leadName);

  const hasPrevious = fromStore.some((a) => a.previous);
  return hasPrevious
    ? fromStore
    : [...fromStore, ...seedPreviousAppointments(leadName)];
}

function loadLeadNotes(leadName: string): NoteEntry[] {
  const fromStore = listNotes()
    .filter((n) => matchesLead(n.relatedTo, leadName))
    .map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      timestamp: n.createdAt,
      owner: n.createdBy,
    }));

  if (fromStore.length > 0) return fromStore;

  return [
    {
      id: `seed-note-${leadName}`,
      title: "Call recap",
      body: "Client is comparing rates with two other lenders, wants to close by end of Q3.",
      timestamp: "Jul 21, 2026 · 4:50 PM",
      owner: "Priya Shrestha",
    },
  ];
}

function loadPreviousActions(leadName: string): ActionEntry[] {
  const candidates = listLeadActivityCandidates(leadName);
  const sorted = [...candidates].sort((a, b) => {
    const aTime = a.dueAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
    const bTime = b.dueAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  const mapped = sorted.slice(0, 12).map((c) => {
    const when =
      c.dueAt ?? c.createdAt
        ? (c.dueAt ?? c.createdAt)!.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "";
    return {
      id: c.id,
      title: c.title,
      kind: c.sourceModule ?? c.kind,
      whenLabel: when,
      bucket: c.bucket === "completed" ? "completed" : "pending",
      href: hrefForLeadActivity(c),
    } satisfies ActionEntry;
  });

  if (mapped.length > 0) return mapped;

  return [
    {
      id: `action-1-${leadName}`,
      title: "Outbound call, left voicemail",
      kind: "calls",
      whenLabel: "Jul 20, 2026 · 3:15 PM",
      bucket: "completed",
    },
    {
      id: `action-2-${leadName}`,
      title: "Email: Intro & next steps",
      kind: "emails",
      whenLabel: "Jul 19, 2026 · 11:02 AM",
      bucket: "completed",
    },
    {
      id: `action-3-${leadName}`,
      title: "Stage moved to New Lead",
      kind: "leads",
      whenLabel: "Jul 10, 2026 · 9:40 AM",
      bucket: "completed",
    },
  ];
}

function actionIcon(kind: string) {
  switch (kind) {
    case "calls":
      return Phone;
    case "emails":
      return Mail;
    case "messages":
      return MessageSquare;
    case "meetings":
      return CalendarDays;
    case "tasks":
      return CheckSquare;
    case "notes":
      return StickyNote;
    default:
      return History;
  }
}

interface LeadEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  initialSection?: SectionId;
  onSuccess?: (message: string) => void;
}

export function LeadEditDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  initialSection = "tasks",
  onSuccess,
}: LeadEditDialogProps) {
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);

  useEffect(() => {
    if (open) setActiveSection(initialSection);
  }, [open, initialSection]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[640px] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Edit {leadName}</DialogTitle>
        <DialogDescription className="sr-only">
          Add and edit opportunity details, tasks, notes and appointments for{" "}
          {leadName}.
        </DialogDescription>

        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              Edit &quot;{leadName}&quot;
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Add and edit opportunity details, tasks, notes and appointments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="w-56 shrink-0 border-r border-slate-100 bg-slate-50/40 py-3">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "block w-full border-l-2 px-4 py-2 text-left text-[13px] font-medium transition-colors",
                  activeSection === s.id
                    ? "border-violet-600 bg-violet-50 text-violet-700"
                    : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeSection === "appointment" && (
              <AppointmentSection leadName={leadName} onSuccess={onSuccess} />
            )}
            {activeSection === "detail" && (
              <ClientDetailsSection
                leadId={leadId}
                leadName={leadName}
                leadEmail={leadEmail}
                leadPhone={leadPhone}
                onClose={() => onOpenChange(false)}
              />
            )}
            {activeSection === "tasks" && (
              <TasksSection leadName={leadName} onSuccess={onSuccess} />
            )}
            {activeSection === "notes" && (
              <NotesSection leadName={leadName} onSuccess={onSuccess} />
            )}
            {activeSection === "associated" && (
              <AttachmentsSection leadId={leadId} leadName={leadName} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Client details ----------------------------- */

function findLeadCard(leadId?: string, leadName?: string): LeadCardData | null {
  if (leadId) {
    const found = findLeadById(leadId);
    if (found) return found.card;
  }
  const needle = leadName?.trim().toLowerCase();
  if (!needle) return null;
  for (const col of listLeadColumns()) {
    const card = col.cards.find((item) => item.name.trim().toLowerCase() === needle);
    if (card) return card;
  }
  return null;
}

function joinAddress(...parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

function applicantAddress(card: LeadCardData, role: "primary" | "secondary") {
  if (role === "secondary") {
    return (
      joinAddress(
        card.custom?.["secondary.currentAddress"],
        card.custom?.["secondary.street"],
        card.custom?.["secondary.city"],
        card.custom?.["secondary.state"],
        card.custom?.["secondary.postalCode"],
        card.custom?.["secondary.country"],
      ) || "—"
    );
  }
  return (
    card.custom?.currentAddress?.trim() ||
    joinAddress(card.street, card.city, card.state, card.postalCode, card.country) ||
    "—"
  );
}

function leadContactApplicants(
  card: LeadCardData | null,
  fallback: { name: string; email?: string; phone?: string },
) {
  if (!card) {
    return [
      {
        role: "Primary" as const,
        name: fallback.name || "—",
        phone: fallback.phone?.trim() || "—",
        email: fallback.email?.trim() || "—",
        address: "—",
      },
    ];
  }

  const people = leadApplicants(card);
  const hasSecondaryFields = Boolean(
    card.custom?.["secondary.firstName"]?.trim() ||
      card.custom?.["secondary.email"]?.trim() ||
      card.custom?.["secondary.phone"]?.trim() ||
      card.custom?.["secondary.mobile"]?.trim(),
  );
  const rows = [
    ...(people.length > 1 || hasSecondaryFields ? people : people.slice(0, 1)),
  ];
  if (rows.length === 1 && hasSecondaryFields) {
    rows.push({
      name: [
        card.custom?.["secondary.firstName"],
        card.custom?.["secondary.middleName"],
        card.custom?.["secondary.surname"] || card.custom?.["secondary.lastName"],
      ]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(" ") || "Secondary applicant",
      role: "Secondary",
      residency: "",
      employment: "",
    });
  }

  return rows.map((person, index) => {
    const secondary = index > 0;
    return {
      role: person.role,
      name: person.name,
      phone: secondary
        ? (
            card.custom?.["secondary.mobile"] ||
            card.custom?.["secondary.phone"] ||
            ""
          ).trim() || "—"
        : (
            card.phone ||
            card.mobilePhone ||
            card.custom?.mobile ||
            fallback.phone ||
            ""
          ).trim() || "—",
      email: secondary
        ? (card.custom?.["secondary.email"] || "").trim() || "—"
        : (card.email || fallback.email || "").trim() || "—",
      address: applicantAddress(card, secondary ? "secondary" : "primary"),
    };
  });
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-[13px] font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ClientDetailsSection({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  onClose,
}: {
  leadId?: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const card = useMemo(
    () => findLeadCard(leadId, leadName),
    [leadId, leadName],
  );
  const applicants = leadContactApplicants(card, {
    name: leadName,
    email: leadEmail,
    phone: leadPhone,
  });

  function openLeadOverview() {
    if (!card) return;
    onClose();
    router.push(`/sales/leads/detail/${encodeURIComponent(card.id)}`);
  }

  return (
    <div className="px-6 py-4">
      <h3 className="text-[15px] font-semibold text-slate-900">Lead Details</h3>
      <p className="mt-0.5 text-[12px] text-slate-500">
        {applicants.length === 1
          ? "Primary applicant on this lead."
          : "Primary and secondary applicants on this lead."}
      </p>
      <div className="mt-4 space-y-4">
        {applicants.map((person) => (
          <div
            key={`${person.role}-${person.name}`}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-left"
          >
            {applicants.length > 1 ? (
              <p className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-[#5A32A3] uppercase">
                {person.role} applicant
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailField label="Name" value={person.name} />
              <DetailField label="Number" value={person.phone} />
              <DetailField label="Email" value={person.email} />
              <DetailField label="Address" value={person.address} />
            </div>
            {card ? (
              <button
                type="button"
                onClick={openLeadOverview}
                className="mt-3 text-[11px] font-medium text-[#5A32A3] hover:underline"
              >
                View all lead details
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Tasks ---------------------------------- */

function TasksSection({
  leadName,
  onSuccess,
}: {
  leadName: string;
  onSuccess?: (message: string) => void;
}) {
  const [tasks, setTasks] = useState<TaskEntry[]>(() => loadLeadTasks(leadName));
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(
    ACTIVITY_OWNERS[0] ?? "",
  );
  const [priority, setPriority] = useState<Priority>("Medium");

  useEffect(() => {
    setTasks(loadLeadTasks(leadName));
  }, [leadName]);

  const openTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === "Open" &&
          t.title.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [tasks, search],
  );
  const previousTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.status === "Done" || t.previous) &&
          t.title.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [tasks, search],
  );

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const created = createTask({
      title: title.trim(),
      taskType: "Follow-up",
      priority,
      status: "Not Started",
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      assignedTo,
      relatedTo: { kind: "Lead", name: leadName },
    });
    const entry: TaskEntry = {
      id: created.taskId,
      title: created.title,
      dueLabel: created.dueDate || "No due date",
      status: "Open",
      priority: created.priority,
      assignedTo: created.assignedTo,
    };
    setTasks((prev) => [entry, ...prev]);
    setTitle("");
    setDueDate("");
    setFormOpen(false);
    onSuccess?.("Task added");
  }

  return (
    <div className="flex h-full flex-col px-6 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-slate-900">Tasks</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Filter tasks"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ListFilter className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Sort tasks"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFormOpen((v) => !v)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-50 py-2 text-[13px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>

      {formOpen && (
        <form
          onSubmit={handleAddTask}
          className="mt-3 flex flex-col gap-2.5 border-y border-slate-100 py-3"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="h-9 w-full border-b border-slate-200 bg-transparent px-0 text-[13px] outline-none focus:border-violet-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 w-full border-b border-slate-200 bg-transparent px-0 text-[13px] outline-none focus:border-violet-500"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="h-9 w-full border-b border-slate-200 bg-transparent px-0 text-[13px] outline-none focus:border-violet-500"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="h-9 w-full border-b border-slate-200 bg-transparent px-0 text-[13px] outline-none focus:border-violet-500"
          >
            {ACTIVITY_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              Save
            </Button>
          </div>
        </form>
      )}

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute top-1/2 left-0 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title"
          className="h-9 w-full border-b border-slate-200 bg-transparent pl-6 pr-2 text-[13px] outline-none focus:border-violet-500"
        />
      </div>

      <div className="mt-4 space-y-5">
        <TaskListBlock
          heading="Open tasks"
          emptyLabel="No open tasks"
          items={openTasks}
        />
        <TaskListBlock
          heading="Previous tasks"
          emptyLabel="No previous tasks"
          items={previousTasks}
        />
      </div>
    </div>
  );
}

function TaskListBlock({
  heading,
  emptyLabel,
  items,
}: {
  heading: string;
  emptyLabel: string;
  items: TaskEntry[];
}) {
  return (
    <section>
      <h4 className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
        {heading}
      </h4>
      {items.length === 0 ? (
        <p className="py-2 text-[12.5px] text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <CheckSquare
                  className={cn(
                    "h-4 w-4 shrink-0",
                    t.status === "Done" ? "text-emerald-500" : "text-slate-300",
                  )}
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-[13px] font-medium text-slate-800",
                      t.status === "Done" && "text-slate-500 line-through",
                    )}
                  >
                    {t.title}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {t.dueLabel} · {t.assignedTo}
                  </p>
                </div>
              </div>
              <span className="ml-2 shrink-0 text-[10px] font-semibold text-slate-400">
                {t.priority}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------- Notes ---------------------------------- */

function NotesSection({
  leadName,
  onSuccess,
}: {
  leadName: string;
  onSuccess?: (message: string) => void;
}) {
  const [notes, setNotes] = useState<NoteEntry[]>(() => loadLeadNotes(leadName));
  const [actions] = useState<ActionEntry[]>(() =>
    loadPreviousActions(leadName),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    setNotes(loadLeadNotes(leadName));
  }, [leadName]);

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const actor = getRulesActor().name || "You";
    const created = createNote({
      title: title.trim() || "Note",
      body: body.trim(),
      relatedTo: `Lead: ${leadName}`,
      createdBy: actor,
    });
    setNotes((prev) => [
      {
        id: created.id,
        title: created.title,
        body: created.body,
        timestamp: created.createdAt,
        owner: created.createdBy,
      },
      ...prev,
    ]);
    setTitle("");
    setBody("");
    setFormOpen(false);
    onSuccess?.("Note added");
  }

  return (
    <div className="flex h-full flex-col px-6 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-slate-900">Notes</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Filter notes"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ListFilter className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Sort notes"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFormOpen((v) => !v)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-50 py-2 text-[13px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
      >
        <Plus className="h-3.5 w-3.5" />
        Add note
      </button>

      {formOpen && (
        <form
          onSubmit={handleAddNote}
          className="mt-3 flex flex-col gap-2.5 border-y border-slate-100 py-3"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Subject (optional)"
            className="h-9 w-full border-b border-slate-200 bg-transparent px-0 text-[13px] outline-none focus:border-violet-500"
          />
          <MentionNotesTextarea
            value={body}
            onChange={setBody}
            placeholder="Add a note… Type @ to assign someone."
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              Save note
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-5">
        <section>
          <h4 className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
            Notes
          </h4>
          {notes.length === 0 ? (
            <p className="py-2 text-[12.5px] text-slate-400">No notes yet</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notes.map((n) => (
                <li key={n.id} className="py-2.5">
                  <p className="text-[13px] font-semibold text-slate-800">
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-[13px] text-slate-600">{n.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {n.timestamp} · {n.owner}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
            <History className="h-3.5 w-3.5" />
            Previous actions
          </h4>
          {actions.length === 0 ? (
            <p className="py-2 text-[12.5px] text-slate-400">
              No previous actions
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {actions.map((a) => {
                const Icon = actionIcon(a.kind);
                return (
                  <li key={a.id} className="flex items-start gap-2.5 py-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        a.bucket === "completed"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-slate-800">
                        {a.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                        {a.bucket === "completed" ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Clock3 className="h-3 w-3 text-amber-500" />
                        )}
                        {a.whenLabel}
                        <span className="text-slate-300">·</span>
                        <span className="capitalize">{a.kind}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/* ------------------------------- Appointment ------------------------------- */

function AppointmentSection({
  leadName,
  onSuccess,
}: {
  leadName: string;
  onSuccess?: (message: string) => void;
}) {
  const [appointments, setAppointments] = useState<AppointmentEntry[]>(() =>
    loadLeadAppointments(leadName),
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [agenda, setAgenda] = useState("");

  useEffect(() => {
    setAppointments(loadLeadAppointments(leadName));
  }, [leadName]);

  const upcoming = appointments.filter((a) => !a.previous);
  const previous = appointments.filter((a) => a.previous);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    const startDateTime = time ? `${date}T${time}` : date;
    const end = new Date(startDateTime);
    if (!Number.isNaN(end.getTime())) end.setHours(end.getHours() + 1);
    const endDateTime = Number.isNaN(end.getTime())
      ? startDateTime
      : end.toISOString().slice(0, 16);

    const created = createMeeting({
      title: `Appointment with ${leadName}`,
      type: "Video Call",
      startDateTime,
      endDateTime,
      status: "Scheduled",
      relatedTo: `Lead: ${leadName}`,
      location: location || undefined,
      meetingLink: meetingLink || undefined,
      agenda: agenda || undefined,
      organizer: getRulesActor().name || ACTIVITY_OWNERS[0] || "Me",
    });
    setAppointments((prev) => [
      {
        id: created.id,
        title: created.title,
        whenLabel: created.startDateTime,
        status: created.status,
        location: created.location,
        previous: false,
      },
      ...prev,
    ]);
    setDate("");
    setTime("");
    setLocation("");
    setMeetingLink("");
    setAgenda("");
    onSuccess?.("Appointment booked");
  }

  return (
    <div className="px-6 py-4">
      <h3 className="text-[15px] font-semibold text-slate-900">
        Meetings
      </h3>

      <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-medium text-slate-600">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 h-9 w-full border-b border-slate-200 bg-transparent px-0 text-[13px] outline-none focus:border-violet-500"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Time
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 h-9 w-full border-b border-slate-200 bg-transparent px-0 text-[13px] outline-none focus:border-violet-500"
            />
          </label>
        </div>

        <label className="block text-xs font-medium text-slate-600">
          Location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Office, address, etc."
            className="mt-1 h-9 w-full border-b border-slate-200 bg-transparent px-0 text-[13px] outline-none focus:border-violet-500"
          />
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Meeting link (optional)
          <input
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="https://…"
            className="mt-1 h-9 w-full border-b border-slate-200 bg-transparent px-0 text-[13px] outline-none focus:border-violet-500"
          />
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Agenda
          <textarea
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-none border-b border-slate-200 bg-transparent px-0 py-2 text-[13px] outline-none focus:border-violet-500"
          />
        </label>

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            Save appointment
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-5">
        <AppointmentListBlock
          heading="Upcoming appointments"
          emptyLabel="No upcoming appointments"
          items={upcoming}
        />
        <AppointmentListBlock
          heading="Previous booked appointments"
          emptyLabel="No previous appointments"
          items={previous}
        />
      </div>
    </div>
  );
}

function AppointmentListBlock({
  heading,
  emptyLabel,
  items,
}: {
  heading: string;
  emptyLabel: string;
  items: AppointmentEntry[];
}) {
  return (
    <section>
      <h4 className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
        {heading}
      </h4>
      {items.length === 0 ? (
        <p className="py-2 text-[12.5px] text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5 py-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                <CalendarDays className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-slate-800">
                  {a.title}
                </p>
                <p className="text-[11px] text-slate-400">
                  {a.whenLabel}
                  {a.location ? ` · ${a.location}` : ""}
                  {` · ${a.status}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------- Attachments ------------------------------- */

function AttachmentsSection({
  leadId,
  leadName,
}: {
  leadId?: string;
  leadName: string;
}) {
  const card = findLeadCard(leadId, leadName);
  const name = card?.name || leadName;
  const files = [
    ...listAttachments()
      .filter((file) => relatedMatchesLead(file.relatedTo, name))
      .map((file) => ({
        id: file.id,
        name: file.fileName,
        kind: file.kind,
        size: file.sizeLabel || "—",
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt,
      })),
    ...listLibraryDocuments()
      .filter((doc) => relatedMatchesLead(doc.relatedTo, name))
      .map((doc) => ({
        id: `lib-${doc.id}`,
        name: doc.fileName,
        kind: "Document",
        size: doc.sizeLabel || "—",
        uploadedBy: doc.owner,
        uploadedAt: doc.uploadedAt,
      })),
  ].filter(
    (file, index, all) =>
      all.findIndex((item) => item.name === file.name && item.uploadedAt === file.uploadedAt) ===
      index,
  );

  return (
    <div className="px-6 py-4">
      <h3 className="text-[15px] font-semibold text-slate-900">Attachments</h3>
      <p className="mt-0.5 text-[12px] text-slate-500">
        Documents on this lead file.
      </p>
      <div className="mt-4">
        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-500">
              <Paperclip className="h-5 w-5" />
            </span>
            <p className="text-[13px] font-semibold text-slate-800">
              No documents on this lead
            </p>
            <p className="text-[12px] text-slate-400">
              Files uploaded to this lead will show here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {files.map((file) => (
              <li key={file.id} className="flex items-start gap-2.5 py-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-[#5A32A3]">
                  <Paperclip className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-slate-800">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {[file.kind, file.size, file.uploadedAt, file.uploadedBy]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
