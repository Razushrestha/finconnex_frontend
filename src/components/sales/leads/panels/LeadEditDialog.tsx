"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import type { Priority } from "@/lib/tasks/types";
import {
  X,
  Plus,
  Search,
  ListFilter,
  ArrowUpDown,
  Trash2,
  StickyNote,
  Link2,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SectionId = "appointment" | "detail" | "tasks" | "notes" | "associated";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "appointment", label: "Book or update appointment" },
  { id: "detail", label: "Client Details" },
  { id: "tasks", label: "Tasks" },
  { id: "notes", label: "Notes" },
  { id: "associated", label: "Associated objects" },
];

// TODO(api): replace with real fetches keyed by leadId, e.g.
//   listLeadTasks(leadId), listLeadNotes(leadId), listLeadAssociations(leadId)
interface TaskEntry {
  id: string;
  title: string;
  dueLabel: string;
  status: "Open" | "Done";
  priority: Priority;
  assignedTo: string;
}

interface NoteEntry {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  owner: string;
}

interface AssociatedEntry {
  id: string;
  type: "Deal" | "Contact" | "Company";
  label: string;
  subtitle?: string;
}

const MOCK_TASKS: TaskEntry[] = [];

const MOCK_NOTES: NoteEntry[] = [
  {
    id: "note-1",
    title: "Call recap",
    body: "Client is comparing rates with two other lenders, wants to close by end of Q3.",
    timestamp: "Jul 21, 2026 · 4:50 PM",
    owner: "Priya Shrestha",
  },
];

const MOCK_ASSOCIATED: AssociatedEntry[] = [
  {
    id: "assoc-1",
    type: "Deal",
    label: "Refinance — 1204 Birch Ave",
    subtitle: "$340,000",
  },
  { id: "assoc-2", type: "Company", label: "Sugimoto Holdings LLC" },
];

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
  leadName,
  initialSection = "tasks",
  onSuccess,
}: LeadEditDialogProps) {
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);

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

        {/* Header */}
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

        {/* Body: sidebar + content */}
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
            {activeSection === "appointment" && <AppointmentSection />}
            {activeSection === "tasks" && (
              <TasksSection onSuccess={onSuccess} />
            )}
            {activeSection === "notes" && (
              <NotesSection onSuccess={onSuccess} />
            )}
            {activeSection === "associated" && <AssociatedSection />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------- Tasks ---------------------------------- */

function TasksSection({
  onSuccess,
}: {
  onSuccess?: (message: string) => void;
}) {
  const [tasks, setTasks] = useState<TaskEntry[]>(MOCK_TASKS);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(
    ACTIVITY_OWNERS[0] ?? "",
  );
  const [priority, setPriority] = useState<Priority>("Medium");

  const filtered = useMemo(
    () =>
      tasks.filter((t) =>
        t.title.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [tasks, search],
  );

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    // TODO(api): createLeadTask(leadId, { title, dueDate, assignedTo, priority })
    const newTask: TaskEntry = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      dueLabel: dueDate || "No due date",
      status: "Open",
      priority,
      assignedTo,
    };
    setTasks((prev) => [newTask, ...prev]);
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
          className="mt-3 flex flex-col gap-2.5 rounded-lg border border-slate-200 p-3"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
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
        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title"
          className="h-9 w-full rounded-md border border-slate-200 pl-9 pr-3 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
        />
      </div>

      <div
        className={cn(
          filtered.length === 0 && "flex flex-1 items-center justify-center",
        )}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-500">
              <Trash2 className="h-5 w-5" />
            </span>
            <p className="text-[13px] font-semibold text-slate-800">
              {tasks.length === 0 ? "No tasks yet" : "No tasks found"}
            </p>
            <p className="text-xs text-slate-400">
              {tasks.length === 0 ? "No tasks found" : "Try a different search"}
            </p>
            {tasks.length === 0 && !formOpen && (
              <Button
                type="button"
                onClick={() => setFormOpen(true)}
                className="mt-1 gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add task
              </Button>
            )}
          </div>
        ) : (
          <ul className="w-full divide-y divide-slate-100">
            {filtered.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare
                    className={cn(
                      "h-4 w-4",
                      t.status === "Done"
                        ? "text-emerald-500"
                        : "text-slate-300",
                    )}
                  />
                  <div>
                    <p className="text-[13px] font-medium text-slate-800">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {t.dueLabel} · {t.assignedTo}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {t.priority}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Notes ---------------------------------- */

function NotesSection({
  onSuccess,
}: {
  onSuccess?: (message: string) => void;
}) {
  const [notes, setNotes] = useState<NoteEntry[]>(MOCK_NOTES);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    // TODO(api): createLeadNote(leadId, { title, body })
    const newNote: NoteEntry = {
      id: `note-${Date.now()}`,
      title: title.trim() || "Note",
      body: body.trim(),
      timestamp: "Just now",
      owner: "You",
    };
    setNotes((prev) => [newNote, ...prev]);
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
        Add note
      </button>

      {formOpen && (
        <form
          onSubmit={handleAddNote}
          className="mt-3 flex flex-col gap-2.5 rounded-lg border border-slate-200 p-3"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Subject (optional)"
            className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Add a note…"
            className="w-full resize-none rounded-md border border-slate-200 px-2.5 py-2 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
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

      <div
        className={cn(
          "mt-3",
          notes.length === 0 && "flex flex-1 items-center justify-center",
        )}
      >
        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-500">
              <StickyNote className="h-5 w-5" />
            </span>
            <p className="text-[13px] font-semibold text-slate-800">
              No notes yet
            </p>
            <p className="text-xs text-slate-400">No notes found</p>
          </div>
        ) : (
          <ul className="w-full divide-y divide-slate-100">
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
      </div>
    </div>
  );
}

/* ------------------------------- Appointment ------------------------------- */

function AppointmentSection() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [agenda, setAgenda] = useState("");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // TODO(api): createOrUpdateLeadAppointment(leadId, { date, time, location, meetingLink, agenda })
  }

  return (
    <div className="px-6 py-4">
      <h3 className="text-[15px] font-semibold text-slate-900">
        Book or update appointment
      </h3>

      <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-medium text-slate-600">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Time
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </label>
        </div>

        <label className="block text-xs font-medium text-slate-600">
          Location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Office, address, etc."
            className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Meeting link (optional)
          <input
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="https://…"
            className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Agenda
          <textarea
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-none rounded-md border border-slate-200 px-2.5 py-2 text-[13px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
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
    </div>
  );
}

/* ----------------------------- Associated objects ---------------------------- */

function AssociatedSection() {
  return (
    <div className="px-6 py-4">
      <h3 className="text-[15px] font-semibold text-slate-900">
        Associated objects
      </h3>

      <div className="mt-4">
        {MOCK_ASSOCIATED.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-500">
              <Link2 className="h-5 w-5" />
            </span>
            <p className="text-[13px] font-semibold text-slate-800">
              No associated objects
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {MOCK_ASSOCIATED.map((a) => (
              <li key={a.id} className="flex items-center gap-2.5 py-2.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {a.type}
                </span>
                <div>
                  <p className="text-[13px] font-medium text-slate-800">
                    {a.label}
                  </p>
                  {a.subtitle && (
                    <p className="text-[11px] text-slate-400">{a.subtitle}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
