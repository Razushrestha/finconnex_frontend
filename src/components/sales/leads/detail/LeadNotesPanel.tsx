"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Filter,
  Lock,
  MoreVertical,
  Pencil,
  Phone,
  Pin,
  PinOff,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { ACTIVITY_OWNERS, initials } from "@/lib/activities/shared";
import { relatedMatchesLead } from "@/lib/leads/activity-index";
import { emitLeadActivityChange, onLeadActivityChange } from "@/lib/leads/lead-extras-store";
import {
  createNote,
  deleteNote,
  listNotes,
  saveNotes,
  updateNote,
} from "@/lib/notes/store";
import type { Note, NoteType } from "@/lib/notes/types";
import type { LeadCardData } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

const PURPLE = "#5A32A3";
const PAGE_SIZE = 5;

type TabId = "all" | "internal" | "meeting" | "followup";

type ComposeType = "Internal Note" | "Meeting Notes" | "Follow-up" | "Call Summary";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All Notes" },
  { id: "internal", label: "Internal Notes" },
  { id: "meeting", label: "Meeting Notes" },
  { id: "followup", label: "Follow Up" },
];

const COMPOSE_TYPES: ComposeType[] = [
  "Internal Note",
  "Meeting Notes",
  "Follow-up",
  "Call Summary",
];

function seedNotes(card: LeadCardData): Note[] {
  const first = card.name.split(" ")[0] ?? card.name;
  const owner = card.owner;
  return [
    {
      id: `${card.id}-note-1`,
      title: "Internal briefing before consult",
      body: `${first} is comparing a variable + offset against a 3-year fixed. Flagged stamp duty concession and first-home buyer eligibility for the next call.`,
      relatedTo: `Lead: ${card.name}`,
      noteType: "General",
      createdBy: owner,
      isPrivate: true,
      isPinned: true,
      createdAt: "22/08/2026 11:05 AM",
    },
    {
      id: `${card.id}-note-2`,
      title: "Follow up after first call",
      body: "Client will send payslips and 3 months of statements this week. Confirm ID is current and ask about any existing credit cards.",
      relatedTo: `Lead: ${card.name}`,
      noteType: "Follow-up",
      createdBy: owner,
      isPrivate: false,
      isPinned: false,
      createdAt: "22/08/2026 03:20 PM",
    },
    {
      id: `${card.id}-note-3`,
      title: "Loan strategy meeting",
      body: "Walked through borrowing capacity and preferred repayment. Offset account is the recommendation if they can keep a 20% buffer.",
      relatedTo: `Lead: ${card.name}`,
      noteType: "Meeting Notes",
      createdBy: owner,
      isPrivate: false,
      isPinned: false,
      createdAt: "21/08/2026 10:30 AM",
    },
    {
      id: `${card.id}-note-4`,
      title: "Pre-approval checklist",
      body: "Still waiting on employment letter. Passport is on file. Remind the client before Friday so we can lodge.",
      relatedTo: `Lead: ${card.name}`,
      noteType: "Other",
      createdBy: owner,
      isPrivate: true,
      isPinned: false,
      createdAt: "20/08/2026 09:15 AM",
    },
    {
      id: `${card.id}-note-5`,
      title: "Call summary — discovery",
      body: "Discussed timeframe to purchase and comfort with repayments. Client wants to stay under $3,200 per month.",
      relatedTo: `Lead: ${card.name}`,
      noteType: "Call Summary",
      createdBy: owner,
      isPrivate: false,
      isPinned: false,
      createdAt: "19/08/2026 04:40 PM",
    },
  ];
}

function matchesTab(note: Note, tab: TabId) {
  if (tab === "all") return true;
  if (tab === "internal") return note.isPrivate || note.noteType === "General";
  if (tab === "meeting") return note.noteType === "Meeting Notes";
  return note.noteType === "Follow-up";
}

function badge(note: Note) {
  if (note.isPrivate || note.noteType === "General") {
    return {
      label: "Internal Note",
      className: "bg-orange-50 text-orange-700",
      iconWrap: "bg-orange-50 text-orange-600",
      Icon: FileText,
    };
  }
  if (note.noteType === "Follow-up") {
    return {
      label: "Follow Up",
      className: "bg-emerald-50 text-emerald-700",
      iconWrap: "bg-emerald-50 text-emerald-600",
      Icon: Phone,
    };
  }
  if (note.noteType === "Meeting Notes") {
    return {
      label: "Meeting Notes",
      className: "bg-violet-50 text-violet-700",
      iconWrap: "bg-violet-50 text-violet-700",
      Icon: Users,
    };
  }
  if (note.noteType === "Call Summary") {
    return {
      label: "Call Summary",
      className: "bg-sky-50 text-sky-700",
      iconWrap: "bg-sky-50 text-sky-600",
      Icon: Phone,
    };
  }
  return {
    label: "Note",
    className: "bg-blue-50 text-blue-700",
    iconWrap: "bg-blue-50 text-blue-600",
    Icon: Lock,
  };
}

function composeFromStore(note: Note): ComposeType {
  if (note.noteType === "Meeting Notes") return "Meeting Notes";
  if (note.noteType === "Follow-up") return "Follow-up";
  if (note.noteType === "Call Summary") return "Call Summary";
  return "Internal Note";
}

function seedKey(leadId: string) {
  return `lead-notes-seeded:${leadId}`;
}

function composeToStore(type: ComposeType): { noteType: NoteType; isPrivate: boolean } {
  if (type === "Internal Note") return { noteType: "General", isPrivate: true };
  if (type === "Meeting Notes") return { noteType: "Meeting Notes", isPrivate: false };
  if (type === "Follow-up") return { noteType: "Follow-up", isPrivate: false };
  return { noteType: "Call Summary", isPrivate: false };
}

export function LeadNotesPanel({ card }: { card: LeadCardData }) {
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composeType, setComposeType] = useState<ComposeType>("Internal Note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pin, setPin] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [mention, setMention] = useState<{ query: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const areaRef = useRef<HTMLDivElement>(null);

  const mentionNames = useMemo(() => {
    const names = new Set<string>([card.owner, ...ACTIVITY_OWNERS]);
    return [...names];
  }, [card.owner]);

  const mentionHits = mention
    ? mentionNames.filter((name) =>
        name.toLowerCase().includes(mention.query.toLowerCase()),
      )
    : [];

  useEffect(() => onLeadActivityChange(() => setRevision((n) => n + 1)), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = seedKey(card.id);
    if (window.sessionStorage.getItem(key)) return;
    const liveNotes = listNotes();
    const known = new Set(liveNotes.map((note) => note.id));
    const extras = seedNotes(card).filter((note) => !known.has(note.id));
    if (extras.length) {
      saveNotes([...extras, ...liveNotes]);
      emitLeadActivityChange();
    }
    window.sessionStorage.setItem(key, "1");
  }, [card]);

  const notes = useMemo(() => {
    void revision;
    return listNotes()
      .filter((note) => relatedMatchesLead(note.relatedTo, card.name))
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [card.name, revision]);

  const visible = notes.filter((note) => {
    if (!matchesTab(note, tab)) return false;
    if (pinnedOnly && !note.isPinned) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${note.title} ${note.body} ${note.createdBy} ${note.noteType}`
      .toLowerCase()
      .includes(q);
  });

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const slice = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function notify(text: string) {
    setFlash(text);
    window.setTimeout(() => setFlash(null), 2000);
  }

  function textBeforeCaret() {
    const root = areaRef.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0) return "";
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(root);
    range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
    return range.toString();
  }

  function syncEditor() {
    const el = areaRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const text = el.innerText.replace(/\u00a0/g, " ").trim();
    setBody(text ? html : "");
    const before = textBeforeCaret();
    const match = before.match(/@([^\s@]*)$/);
    if (!match) {
      setMention(null);
      return;
    }
    setMention({ query: match[1] });
    setMentionIndex(0);
  }

  function insertMention(name: string) {
    const el = areaRef.current;
    if (!el) return;
    el.focus();
    const before = textBeforeCaret();
    const match = before.match(/@([^\s@]*)$/);
    if (match) {
      for (let i = 0; i < match[0].length; i += 1) {
        document.execCommand("delete");
      }
    }
    document.execCommand("insertText", false, `@${name} `);
    setMention(null);
    syncEditor();
  }

  function onBodyKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (mention && mentionHits.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionHits.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionHits.length) % mentionHits.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionHits[mentionIndex] ?? mentionHits[0]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }

    const key = e.key.toLowerCase();
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    if (key === "b") {
      e.preventDefault();
      document.execCommand("bold");
      syncEditor();
      return;
    }
    if (key === "u") {
      e.preventDefault();
      document.execCommand("underline");
      syncEditor();
      return;
    }
    if (key === "i") {
      e.preventDefault();
      document.execCommand("italic");
      syncEditor();
    }
  }

  function save() {
    const el = areaRef.current;
    const html = el?.innerHTML ?? body;
    const text = (el?.innerText ?? body).replace(/\u00a0/g, " ").trim();
    const heading =
      title.trim() ||
      text.split("\n").find((line) => line.trim())?.slice(0, 72) ||
      "Note";
    if (!text) return;
    const mapped = composeToStore(composeType);
    if (editingId) {
      updateNote(editingId, {
        title: heading,
        body: html,
        isPinned: pin,
        isPrivate: mapped.isPrivate,
      });
      setEditingId(null);
      notify("Note updated");
    } else {
      createNote({
        title: heading,
        body: html,
        relatedTo: `Lead: ${card.name}`,
        noteType: mapped.noteType,
        createdBy: card.owner,
        isPrivate: mapped.isPrivate,
        isPinned: pin,
      });
      notify("Note saved");
    }
    setTitle("");
    setBody("");
    if (el) el.innerHTML = "";
    setPin(false);
    setPage(1);
  }

  function plainBody(note: Note) {
    return note.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setTitle(note.title);
    setComposeType(composeFromStore(note));
    setPin(note.isPinned);
    setBody(note.body);
    const el = areaRef.current;
    if (el) el.innerHTML = note.body;
    setMenuId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setPin(false);
    if (areaRef.current) areaRef.current.innerHTML = "";
  }

  function togglePin(note: Note) {
    updateNote(note.id, { isPinned: !note.isPinned });
    setMenuId(null);
    notify(note.isPinned ? "Note unpinned" : "Note pinned");
  }

  async function copyNote(note: Note) {
    const text = `${note.title}\n${plainBody(note)}`;
    try {
      await navigator.clipboard.writeText(text);
      notify("Note copied");
    } catch {
      notify("Could not copy note");
    }
    setMenuId(null);
  }

  function duplicateNote(note: Note) {
    createNote({
      title: `${note.title} (copy)`,
      body: note.body,
      relatedTo: note.relatedTo,
      noteType: note.noteType,
      createdBy: card.owner,
      isPrivate: note.isPrivate,
      isPinned: false,
    });
    setMenuId(null);
    notify("Note duplicated");
  }

  function removeNote(note: Note) {
    if (!window.confirm(`Delete “${note.title}”? This cannot be undone.`)) return;
    deleteNote(note.id);
    if (editingId === note.id) cancelEdit();
    if (expanded === note.id) setExpanded(null);
    setMenuId(null);
    notify("Note deleted");
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="text-[18px] font-semibold text-slate-900">Notes</h2>
          <div className="flex items-center gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search notes..."
                className="h-8 w-48 rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-[12px] outline-none focus:ring-1 focus:ring-[#5A32A3]"
              />
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
              </button>
              {filterOpen ? (
                <div className="absolute top-9 right-0 z-20 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setPinnedOnly(false);
                      setFilterOpen(false);
                    }}
                    className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    All notes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPinnedOnly(true);
                      setFilterOpen(false);
                      setPage(1);
                    }}
                    className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    Pinned only
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-b border-slate-100 px-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setPage(1);
              }}
              className={cn(
                "border-b-2 py-2 text-[13px] font-medium",
                tab === item.id
                  ? "border-[#5A32A3] text-[#5A32A3]"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {slice.length === 0 ? (
            <li className="px-4 py-10 text-center text-[13px] text-slate-400">
              No notes in this view.
            </li>
          ) : (
            slice.map((note) => {
              const meta = badge(note);
              const Icon = meta.Icon;
              const open = expanded === note.id;
              const menuOpen = menuId === note.id;
              return (
                <li key={note.id} className="relative">
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((id) => (id === note.id ? null : note.id))
                      }
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          meta.iconWrap,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              meta.className,
                            )}
                          >
                            {meta.label}
                          </span>
                          {note.isPinned ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
                              <Pin className="h-3 w-3" />
                              Pinned
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-[14px] font-semibold text-slate-900">
                          {note.title}
                        </span>
                        <NoteBody html={note.body} clamp={!open} />
                      </span>
                      <span className="hidden w-40 shrink-0 text-right sm:block">
                        <span className="block text-[12px] font-medium text-slate-700">
                          {note.createdBy}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {note.createdAt}
                        </span>
                      </span>
                    </button>
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        aria-label="Note actions"
                        aria-expanded={menuOpen}
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuId((id) => (id === note.id ? null : note.id));
                        }}
                        className="mt-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpen ? (
                        <>
                          <button
                            type="button"
                            aria-label="Close note menu"
                            className="fixed inset-0 z-20 cursor-default"
                            onClick={() => setMenuId(null)}
                          />
                          <div className="absolute top-8 right-0 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                            <MenuItem
                              icon={note.isPinned ? PinOff : Pin}
                              label={note.isPinned ? "Unpin note" : "Pin note"}
                              onClick={() => togglePin(note)}
                            />
                            <MenuItem
                              icon={Pencil}
                              label="Edit note"
                              onClick={() => startEdit(note)}
                            />
                            <MenuItem
                              icon={Copy}
                              label="Copy note"
                              onClick={() => void copyNote(note)}
                            />
                            <MenuItem
                              icon={Copy}
                              label="Duplicate"
                              onClick={() => duplicateNote(note)}
                            />
                            <MenuItem
                              icon={Lock}
                              label={note.isPrivate ? "Make visible" : "Mark private"}
                              onClick={() => {
                                updateNote(note.id, { isPrivate: !note.isPrivate });
                                setMenuId(null);
                                notify(
                                  note.isPrivate
                                    ? "Note is visible"
                                    : "Note marked private",
                                );
                              }}
                            />
                            <div className="my-1 border-t border-slate-100" />
                            <MenuItem
                              icon={Trash2}
                              label="Delete"
                              danger
                              onClick={() => removeNote(note)}
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
          <p>
            Showing {visible.length ? (safePage - 1) * PAGE_SIZE + 1 : 0} to{" "}
            {Math.min(safePage * PAGE_SIZE, visible.length)} of {visible.length} notes
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((n) => Math.max(1, n - 1))}
              className="rounded p-1 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={cn(
                  "h-6 min-w-6 rounded px-1.5 text-[11px] font-semibold",
                  n === safePage
                    ? "bg-[#5A32A3] text-white"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= pages}
              onClick={() => setPage((n) => Math.min(pages, n + 1))}
              className="rounded p-1 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="ml-2 rounded-md border border-slate-200 px-1.5 py-0.5">
              {PAGE_SIZE} / page
            </span>
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <h3 className="text-[15px] font-semibold text-slate-900">
          {editingId ? "Edit note" : "Add a Note"}
        </h3>
        <label className="mt-3 block text-[11px] font-semibold text-slate-500">
          Note type
        </label>
        <div className="relative mt-1">
          <Lock className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select
            value={composeType}
            onChange={(e) => setComposeType(e.target.value as ComposeType)}
            className="fc-select-caret h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[12px] outline-none focus:ring-1 focus:ring-[#5A32A3]"
          >
            {COMPOSE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        <label className="mt-3 block text-[11px] font-semibold text-slate-500">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:ring-1 focus:ring-[#5A32A3]"
        />

        <div className="relative mt-3 min-h-0 flex-1">
          <div
            ref={areaRef}
            contentEditable
            role="textbox"
            aria-label="Note body"
            suppressContentEditableWarning
            data-placeholder="Type your note here..."
            onInput={syncEditor}
            onClick={syncEditor}
            onKeyUp={syncEditor}
            onKeyDown={onBodyKeyDown}
            className={cn(
              "h-full min-h-[140px] overflow-y-auto rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:ring-1 focus:ring-[#5A32A3]",
              "[&:empty]:before:pointer-events-none [&:empty]:before:text-slate-400 [&:empty]:before:content-[attr(data-placeholder)]",
              "[&_b]:font-bold [&_strong]:font-bold [&_u]:underline [&_i]:italic [&_em]:italic",
            )}
          />
          {mention && mentionHits.length ? (
            <div className="absolute bottom-2 left-2 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {mentionHits.slice(0, 6).map((name, i) => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(name);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px]",
                    i === mentionIndex
                      ? "bg-violet-50 font-medium text-[#5A32A3]"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold">
                    {initials(name)}
                  </span>
                  {name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-[12px] text-slate-600">
            <input
              type="checkbox"
              checked={pin}
              onChange={(e) => setPin(e.target.checked)}
              className="rounded border-slate-300"
            />
            Pin this note
          </label>
          <div className="flex items-center gap-2">
            {editingId ? (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-[12px] font-medium text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              disabled={!body.trim()}
              onClick={save}
              className="inline-flex h-8 items-center rounded-lg px-3 text-[12px] font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: PURPLE }}
            >
              {editingId ? "Update Note" : "Save Note"}
            </button>
          </div>
        </div>
      </aside>

      {flash ? (
        <div className="fixed right-5 bottom-16 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] text-white shadow-lg">
          {flash}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pin;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px]",
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function NoteBody({ html, clamp }: { html: string; clamp?: boolean }) {
  const clean = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  const rich = /<\/?[a-z][\s\S]*>/i.test(clean);
  if (!rich) {
    return (
      <span
        className={cn(
          "mt-0.5 block text-[12px] leading-relaxed text-slate-500",
          clamp ? "line-clamp-2" : "whitespace-pre-wrap",
        )}
      >
        {clean}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "mt-0.5 block text-[12px] leading-relaxed text-slate-500",
        clamp && "line-clamp-2",
        "[&_b]:font-bold [&_strong]:font-bold [&_u]:underline [&_i]:italic [&_em]:italic",
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
