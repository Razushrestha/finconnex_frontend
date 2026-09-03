"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Contact,
  Delete,
  FilePlus,
  Grip,
  Info,
  LayoutGrid,
  Maximize2,
  MessageSquare,
  Minimize2,
  Phone,
  PhoneIncoming,
  PhoneOff,
  PhoneOutgoing,
  Pin,
  Search,
  StickyNote,
  Tag,
  UserRound,
  Voicemail,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createCall,
  formatCallDate,
  listCalls,
  parseCallDurationSeconds,
  updateCall,
} from "@/lib/calls/store";
import { listAllContacts } from "@/lib/contacts/store";
import { createNote } from "@/lib/notes/store";
import {
  resolveSoftphoneRecord,
  type SoftphoneRecord,
} from "@/lib/softphone/resolve-record";
import type { Call, CallStatus } from "@/lib/calls/types";
import {
  SOFTPHONE_H,
  SOFTPHONE_W,
} from "@/lib/softphone/events";

type Tab = "recents" | "contacts" | "keypad" | "voicemail";

const PHONE_W = SOFTPHONE_W;
const PHONE_H = SOFTPHONE_H;
const KEYS = [
  { d: "1" },
  { d: "2" },
  { d: "3" },
  { d: "4" },
  { d: "5" },
  { d: "6" },
  { d: "7" },
  { d: "8" },
  { d: "9" },
  { d: "*" },
  { d: "0", sub: "+" },
  { d: "#" },
] as const;

const OWNER = "John Smith";

const DISPOSITIONS: { label: string; status: CallStatus }[] = [
  { label: "No Answer", status: "No Answer" },
  { label: "Busy", status: "Busy" },
  { label: "Voicemail", status: "Voicemail Left" },
  { label: "Completed", status: "Completed" },
];

function formatDurationClock(totalSeconds: number) {
  const secs = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${String(mins).padStart(2, "0")} Min ${String(rem).padStart(2, "0")} Sec`;
}

function relativeWhen(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  const mins = Math.round((Date.now() - parsed) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Date(parsed).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
  });
}

export function SoftphonePad({
  open,
  onClose,
  anchor,
  presetNumber,
  presetName,
  presetRelatedTo,
  autoStart = false,
  placementKey = 0,
}: {
  open: boolean;
  onClose: () => void;
  anchor?: { x: number; y: number } | null;
  presetNumber?: string;
  presetName?: string;
  presetRelatedTo?: string;
  autoStart?: boolean;
  placementKey?: number;
}) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("keypad");
  const [dial, setDial] = React.useState("");
  const [calling, setCalling] = React.useState(false);
  const [contactLabel, setContactLabel] = React.useState("");
  const [activeCallId, setActiveCallId] = React.useState<string | null>(null);
  const [pinned, setPinned] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 16, y: 80 });
  const [query, setQuery] = React.useState("");
  const [voiceScope, setVoiceScope] = React.useState<"me" | "all">("me");
  const [openRow, setOpenRow] = React.useState<string | null>(null);
  const [noteFor, setNoteFor] = React.useState<{
    number: string;
    name?: string;
    callId?: string;
    durationSeconds?: number;
  } | null>(null);
  const [noteBody, setNoteBody] = React.useState("");
  const [noteSaved, setNoteSaved] = React.useState("");
  const [disposition, setDisposition] = React.useState<CallStatus>("Completed");
  const callStartedAt = React.useRef<number | null>(null);
  const [tick, setTick] = React.useState(0);
  const dragRef = React.useRef<{
    ox: number;
    oy: number;
    sx: number;
    sy: number;
  } | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pinned) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pinned, onClose]);

  React.useEffect(() => {
    if (!open) return;
    setTab("keypad");
    setQuery("");
    if (presetNumber?.trim()) setDial(presetNumber.trim());
    if (typeof window === "undefined") return;
    if (anchor) {
      setPos(anchor);
      return;
    }
    setPos({ x: 16, y: Math.max(16, window.innerHeight - PHONE_H - 56) });
  }, [open, placementKey, anchor, presetNumber]);

  const contacts = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return listAllContacts()
      .filter((c) => c.phone || c.mobile)
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.mobile?.includes(q) ?? false)
        );
      });
  }, [query, tick]);

  const recents = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return listCalls()
      .filter((c) => c.fromNumber || c.contact)
      .filter((c) => {
        if (!q) return true;
        return (
          (c.contact ?? "").toLowerCase().includes(q) ||
          (c.fromNumber ?? "").includes(q) ||
          (c.subject ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [query, tick]);

  const voicemails = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return listCalls()
      .filter(
        (c) =>
          c.callType === "Voicemail" ||
          c.status === "Voicemail Left" ||
          c.status === "Left Voicemail",
      )
      .filter((c) => (voiceScope === "me" ? c.assignedTo === OWNER : true))
      .filter((c) => {
        if (!q) return true;
        return (
          (c.contact ?? "").toLowerCase().includes(q) ||
          (c.fromNumber ?? "").includes(q)
        );
      });
  }, [query, voiceScope, tick]);

  function startCall(
    number = dial,
    name?: string,
    relatedTo?: string,
    force = false,
  ) {
    const n = number.trim();
    if (!n) return;
    if (calling && !force) return;
    const record = resolveSoftphoneRecord({ phone: n, name });
    const display = name || record?.name || n;
    setDial(n);
    setContactLabel(display);
    setCalling(true);
    callStartedAt.current = Date.now();
    setTab("keypad");
    setNoteFor(null);
    const call = createCall({
      subject: `Softphone — ${display}`,
      relatedTo: relatedTo || record?.relatedTo,
      contact: display,
      fromNumber: n,
      callType: "Outbound",
      status: "Scheduled",
      date: formatCallDate(new Date()),
      assignedTo: OWNER,
      calledBy: OWNER,
    });
    setActiveCallId(call.id);
    setTick((v) => v + 1);
  }

  const autoStartedFor = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!open || !autoStart) return;
    const n = presetNumber?.trim();
    if (!n) return;
    if (autoStartedFor.current === placementKey) return;
    autoStartedFor.current = placementKey;
    startCall(n, presetName, presetRelatedTo, true);
    // placementKey retriggers a fresh outbound call from a record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, placementKey, autoStart, presetNumber, presetName, presetRelatedTo]);

  function endCall() {
    const elapsed = callStartedAt.current
      ? Math.max(1, Math.round((Date.now() - callStartedAt.current) / 1000))
      : 0;
    callStartedAt.current = null;
    if (activeCallId) {
      updateCall(activeCallId, {
        status: "Completed",
        duration: formatDurationClock(elapsed),
        recording: { durationSeconds: elapsed },
        calledBy: OWNER,
      });
    }
    setCalling(false);
    setDisposition("Completed");
    setNoteFor({
      number: dial,
      name: resolveSoftphoneRecord({ phone: dial })?.name,
      callId: activeCallId ?? undefined,
      durationSeconds: elapsed,
    });
    setNoteBody("");
    setNoteSaved("");
    setTick((v) => v + 1);
  }

  function saveCallNote() {
    if (!noteFor) return;
    const body = noteBody.trim();
    if (!body) return;
    const record = resolveSoftphoneRecord({
      phone: noteFor.number,
      name: noteFor.name,
    });
    const relatedTo = record?.relatedTo || `Contact: ${noteFor.number}`;
    createNote({
      title: `Call note — ${record?.name || noteFor.name || noteFor.number}`,
      body,
      relatedTo,
      noteType: "Call Summary",
      createdBy: OWNER,
    });
    if (noteFor.callId) {
      updateCall(noteFor.callId, {
        notes: body,
        relatedTo: record?.relatedTo,
        status: disposition,
        outcome: DISPOSITIONS.find((item) => item.status === disposition)?.label,
      });
    }
    setNoteFor(null);
    setNoteBody("");
    setNoteSaved("");
    setTab("keypad");
    setTick((v) => v + 1);
  }

  function openNote(call: {
    number: string;
    name?: string;
    callId?: string;
    durationSeconds?: number;
    status?: CallStatus;
  }) {
    setNoteFor(call);
    setDisposition(
      DISPOSITIONS.some((item) => item.status === call.status)
        ? (call.status as CallStatus)
        : "Completed",
    );
    setNoteBody("");
    setNoteSaved("");
  }

  function goRecord(record: SoftphoneRecord | null) {
    if (!record) return;
    onClose();
    router.push(record.href);
  }

  function onDragStart(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button,input,textarea")) return;
    dragRef.current = { ox: pos.x, oy: pos.y, sx: e.clientX, sy: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    setPos({
      x: Math.max(8, dragRef.current.ox + e.clientX - dragRef.current.sx),
      y: Math.max(8, dragRef.current.oy + e.clientY - dragRef.current.sy),
    });
  }

  if (!mounted || !open) return null;

  const width = expanded ? 360 : PHONE_W;
  const height = PHONE_H;
  const top = Math.min(pos.y, Math.max(8, window.innerHeight - height - 8));
  const noteTarget = noteFor
    ? resolveSoftphoneRecord({ phone: noteFor.number, name: noteFor.name })
    : null;

  return createPortal(
    <div
      style={{ left: pos.x, top, width, height }}
      className="fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.16)]"
    >
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        className="flex shrink-0 cursor-grab items-center justify-between px-3 pt-2.5 pb-1 active:cursor-grabbing"
      >
        <Grip className="h-4 w-4 text-slate-400" />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title={pinned ? "Unpin" : "Pin"}
            onClick={() => setPinned((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50"
          >
            <Pin className={cn("h-3.5 w-3.5", pinned && "fill-slate-600")} />
          </button>
          <button
            type="button"
            title={expanded ? "Compact" : "Expand"}
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50"
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            title="Close"
            aria-label="Close softphone"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 px-4",
          noteFor || tab !== "keypad"
            ? "overflow-y-auto overscroll-contain [scrollbar-width:thin]"
            : "overflow-hidden",
        )}
      >
        {noteFor ? (
          <CallNoteComposer
            record={noteTarget}
            number={noteFor.number}
            name={noteFor.name}
            durationSeconds={noteFor.durationSeconds ?? 0}
            disposition={disposition}
            onDisposition={(status) => {
              setDisposition(status);
              if (noteFor.callId) {
                updateCall(noteFor.callId, {
                  status,
                  outcome: DISPOSITIONS.find((item) => item.status === status)
                    ?.label,
                });
              }
            }}
            body={noteBody}
            savedTo={noteSaved}
            onChange={setNoteBody}
            onSave={saveCallNote}
            onSkip={() => setNoteFor(null)}
          />
        ) : null}

        {!noteFor && tab === "keypad" ? (
          <Keypad
            dial={dial}
            calling={calling}
            callingLabel={contactLabel}
            onDialChange={setDial}
            onCall={() => (calling ? endCall() : startCall())}
          />
        ) : null}

        {!noteFor && tab === "recents" ? (
          <RecentsPane
            query={query}
            onQuery={setQuery}
            rows={recents}
            openRow={openRow}
            onToggle={(id) => setOpenRow((cur) => (cur === id ? null : id))}
            onCall={(c) => startCall(c.fromNumber || "", c.contact)}
            onNote={(c) =>
              openNote({
                number: c.fromNumber || "",
                name: c.contact,
                callId: c.id,
                durationSeconds: parseCallDurationSeconds(c),
                status: c.status,
              })
            }
            onOpenRecord={(c) =>
              goRecord(
                resolveSoftphoneRecord({
                  phone: c.fromNumber,
                  name: c.contact,
                }),
              )
            }
            onMessage={() => {
              onClose();
              router.push("/marketing/inbox");
            }}
          />
        ) : null}

        {!noteFor && tab === "contacts" ? (
          <ContactsPane
            query={query}
            onQuery={setQuery}
            rows={contacts}
            onCall={(c) => startCall(c.mobile || c.phone, c.name)}
          />
        ) : null}

        {!noteFor && tab === "voicemail" ? (
          <VoicemailPane
            query={query}
            onQuery={setQuery}
            scope={voiceScope}
            onScope={setVoiceScope}
            rows={voicemails}
            onCall={(c) => startCall(c.fromNumber || "", c.contact)}
            onNote={(c) =>
              openNote({
                number: c.fromNumber || "",
                name: c.contact,
                callId: c.id,
                durationSeconds: parseCallDurationSeconds(c),
                status: c.status,
              })
            }
            onMessage={() => {
              onClose();
              router.push("/marketing/inbox");
            }}
          />
        ) : null}
      </div>

      <nav className="grid shrink-0 grid-cols-4 border-t border-slate-100 bg-white px-1 py-1">
        <TabBtn
          label="Recents"
          active={tab === "recents"}
          onClick={() => {
            setNoteFor(null);
            setTab("recents");
          }}
          icon={Clock}
        />
        <TabBtn
          label="Contacts"
          active={tab === "contacts"}
          onClick={() => {
            setNoteFor(null);
            setTab("contacts");
          }}
          icon={Contact}
        />
        <TabBtn
          label="Keypad"
          active={tab === "keypad"}
          onClick={() => setTab("keypad")}
          icon={LayoutGrid}
        />
        <TabBtn
          label="Voicemail"
          active={tab === "voicemail"}
          onClick={() => {
            setNoteFor(null);
            setTab("voicemail");
          }}
          icon={Voicemail}
        />
      </nav>
    </div>,
    document.body,
  );
}

const DIAL_MAX = 18;
const DIAL_CHARS = /^[0-9+*#]$/;

function sanitizeDial(value: string) {
  return value.replace(/[^0-9+*#]/g, "").slice(0, DIAL_MAX);
}

function Keypad({
  dial,
  calling,
  callingLabel,
  onDialChange,
  onCall,
}: {
  dial: string;
  calling: boolean;
  callingLabel?: string;
  onDialChange: (value: string) => void;
  onCall: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const selection = React.useRef({ start: dial.length, end: dial.length });

  React.useEffect(() => {
    const el = inputRef.current;
    if (el && document.activeElement === el) return;
    selection.current = { start: dial.length, end: dial.length };
  }, [dial]);

  function syncSelection() {
    const el = inputRef.current;
    if (!el) return;
    selection.current = {
      start: el.selectionStart ?? dial.length,
      end: el.selectionEnd ?? dial.length,
    };
  }

  function setValue(next: string, caret: number) {
    const value = sanitizeDial(next);
    const pos = Math.max(0, Math.min(caret, value.length));
    selection.current = { start: pos, end: pos };
    onDialChange(value);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el || calling) return;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function press(digit: string) {
    if (calling) return;
    const { start, end } = selection.current;
    if (dial.length >= DIAL_MAX && start === end) return;
    setValue(dial.slice(0, start) + digit + dial.slice(end), start + digit.length);
  }

  function backspace() {
    if (calling) return;
    const { start, end } = selection.current;
    if (start !== end) {
      setValue(dial.slice(0, start) + dial.slice(end), start);
      return;
    }
    if (start <= 0) return;
    setValue(dial.slice(0, start - 1) + dial.slice(start), start - 1);
  }

  return (
    <div className="pb-1">
      {calling ? (
        <>
          <p className="mb-2 min-h-[28px] text-center text-[15px] font-medium text-emerald-600">
            Calling {callingLabel || dial}…
          </p>
          {callingLabel && callingLabel !== dial ? (
            <p className="mb-2 text-center text-[12px] text-slate-500">{dial}</p>
          ) : null}
        </>
      ) : (
        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          spellCheck={false}
          value={dial}
          aria-label="Phone number"
          placeholder=" "
          onChange={(e) => {
            const next = sanitizeDial(e.target.value);
            const pos = Math.min(e.target.selectionStart ?? next.length, next.length);
            selection.current = { start: pos, end: pos };
            onDialChange(next);
            requestAnimationFrame(() => {
              inputRef.current?.setSelectionRange(pos, pos);
            });
          }}
          onClick={syncSelection}
          onKeyUp={syncSelection}
          onSelect={syncSelection}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCall();
              return;
            }
            if (
              e.key === "Backspace" ||
              e.key === "Delete" ||
              e.key === "ArrowLeft" ||
              e.key === "ArrowRight" ||
              e.key === "ArrowUp" ||
              e.key === "ArrowDown" ||
              e.key === "Home" ||
              e.key === "End" ||
              e.key === "Tab" ||
              e.metaKey ||
              e.ctrlKey ||
              e.altKey
            ) {
              return;
            }
            if (!DIAL_CHARS.test(e.key)) e.preventDefault();
          }}
          className="mb-2 h-8 w-full bg-transparent text-center font-mono text-[22px] tracking-wide text-slate-900 caret-slate-800 outline-none placeholder:text-transparent"
        />
      )}
      <div className="mx-auto grid max-w-[240px] grid-cols-3 justify-items-center gap-x-4 gap-y-2">
        {KEYS.map((key) => (
          <button
            key={key.d}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => press(key.d)}
            onContextMenu={(e) => {
              if (key.d === "0") {
                e.preventDefault();
                press("+");
              }
            }}
            className="flex h-[48px] w-[48px] flex-col items-center justify-center rounded-full bg-slate-100 text-[20px] font-medium text-slate-800 hover:bg-slate-200"
          >
            {key.d}
            {"sub" in key ? (
              <span className="-mt-0.5 text-[10px] font-semibold text-slate-500">
                {key.sub}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="relative mx-auto mt-3 flex h-[48px] max-w-[240px] items-center justify-center">
        <button
          type="button"
          aria-label={calling ? "End call" : "Call"}
          disabled={!calling && !dial}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCall}
          className={cn(
            "flex h-[48px] w-[48px] items-center justify-center rounded-full text-white shadow-sm disabled:opacity-40",
            calling ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600",
          )}
        >
          <Phone className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Backspace"
          onMouseDown={(e) => e.preventDefault()}
          onClick={backspace}
          className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="mb-2 flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5">
      <Search className="h-3.5 w-3.5 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-slate-400"
      />
    </label>
  );
}

function RecentsPane({
  query,
  onQuery,
  rows,
  openRow,
  onToggle,
  onCall,
  onNote,
  onOpenRecord,
  onMessage,
}: {
  query: string;
  onQuery: (v: string) => void;
  rows: Call[];
  openRow: string | null;
  onToggle: (id: string) => void;
  onCall: (c: Call) => void;
  onNote: (c: Call) => void;
  onOpenRecord: (c: Call) => void;
  onMessage: () => void;
}) {
  return (
    <div className="pb-2">
      <h3 className="mb-2 text-[18px] font-semibold text-slate-900">Recents</h3>
      <SearchField
        value={query}
        onChange={onQuery}
        placeholder="Search for Contacts"
      />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-[12px] text-slate-400">
          No recent calls
        </p>
      ) : (
        <ul>
          {rows.map((c) => {
            const record = resolveSoftphoneRecord({
              phone: c.fromNumber,
              name: c.contact,
            });
            const open = openRow === c.id;
            const outbound = c.callType === "Outbound";
            return (
              <li key={c.id} className="border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => onToggle(c.id)}
                  className="flex w-full items-center gap-2 py-2 text-left"
                >
                  <Avatar
                    initials={record?.initials || initialsSafe(c.contact)}
                    className={record?.avatarClass}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800">
                      {c.contact || c.fromNumber || c.subject}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {c.fromNumber}
                    </p>
                  </div>
                  {outbound ? (
                    <PhoneOutgoing className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <PhoneIncoming className="h-3.5 w-3.5 text-rose-400" />
                  )}
                  <span className="text-[10px] text-slate-400">
                    {relativeWhen(c.date)}
                  </span>
                  {open ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>
                {open ? (
                  <div className="mb-2 rounded-xl bg-slate-50 px-2 py-2">
                    <div className="mb-2 flex items-center gap-2">
                      <Avatar
                        initials={record?.initials || initialsSafe(c.contact)}
                        className={record?.avatarClass}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-rose-600">
                          {c.contact || record?.name || "Unknown"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {c.fromNumber}
                          {record ? ` · ${record.kind}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      <Action
                        label="contact"
                        icon={UserRound}
                        onClick={() => onOpenRecord(c)}
                      />
                      <Action label="Tags" icon={Tag} onClick={() => onOpenRecord(c)} />
                      <Action
                        label="Notes"
                        icon={FilePlus}
                        onClick={() => onNote(c)}
                      />
                      <Action
                        label="Message"
                        icon={MessageSquare}
                        onClick={onMessage}
                      />
                      <Action
                        label="Redial"
                        icon={Phone}
                        onClick={() => onCall(c)}
                      />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ContactsPane({
  query,
  onQuery,
  rows,
  onCall,
}: {
  query: string;
  onQuery: (v: string) => void;
  rows: ReturnType<typeof listAllContacts>;
  onCall: (c: ReturnType<typeof listAllContacts>[number]) => void;
}) {
  return (
    <div className="pb-2">
      <h3 className="mb-2 text-[18px] font-semibold text-slate-900">Contacts</h3>
      <SearchField
        value={query}
        onChange={onQuery}
        placeholder="Search for Contacts"
      />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-[12px] text-slate-400">
          No contacts with a number
        </p>
      ) : (
        <ul>
          {rows.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 border-b border-slate-100 py-2"
            >
              <Avatar initials={c.initials} className={c.avatarBgClass} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-800">
                  {c.name}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {c.mobile || c.phone}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Call ${c.name}`}
                onClick={() => onCall(c)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50"
              >
                <Phone className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VoicemailPane({
  query,
  onQuery,
  scope,
  onScope,
  rows,
  onCall,
  onNote,
  onMessage,
}: {
  query: string;
  onQuery: (v: string) => void;
  scope: "me" | "all";
  onScope: (v: "me" | "all") => void;
  rows: Call[];
  onCall: (c: Call) => void;
  onNote: (c: Call) => void;
  onMessage: () => void;
}) {
  return (
    <div className="pb-2">
      <SearchField
        value={query}
        onChange={onQuery}
        placeholder="Search for a phone number"
      />
      <div className="mb-2 flex gap-3 text-[12px] font-semibold">
        <button
          type="button"
          onClick={() => onScope("me")}
          className={scope === "me" ? "text-sky-600" : "text-slate-400"}
        >
          For Me
        </button>
        <button
          type="button"
          onClick={() => onScope("all")}
          className={scope === "all" ? "text-sky-600" : "text-slate-400"}
        >
          All
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-[12px] text-slate-400">
          No voicemail
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => {
            const record = resolveSoftphoneRecord({
              phone: c.fromNumber,
              name: c.contact,
            });
            const secs = parseCallDurationSeconds(c);
            return (
              <li key={c.id} className="rounded-xl border border-slate-100 p-2">
                <div className="flex items-start gap-2">
                  <Avatar
                    initials={record?.initials || initialsSafe(c.contact)}
                    className={record?.avatarClass}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800">
                      {c.contact || record?.name || "Unknown"}
                    </p>
                    <p className="text-[11px] text-slate-500">{c.fromNumber}</p>
                    {record ? (
                      <span className="mt-0.5 inline-flex rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                        {record.kind}: {record.name}
                      </span>
                    ) : null}
                    <p className="mt-0.5 text-[10px] text-slate-400">{c.date}</p>
                  </div>
                  <div className="flex gap-0.5">
                    <IconTiny
                      label="Call"
                      onClick={() => onCall(c)}
                      className="text-emerald-600"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </IconTiny>
                    <IconTiny label="Message" onClick={onMessage}>
                      <MessageSquare className="h-3.5 w-3.5" />
                    </IconTiny>
                    <IconTiny label="Note" onClick={() => onNote(c)}>
                      <StickyNote className="h-3.5 w-3.5" />
                    </IconTiny>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-sky-600">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white">
                    ▶
                  </span>
                  <span>0:00 / 0:{String(Math.max(secs, 2)).padStart(2, "0")}</span>
                  <span className="h-1 flex-1 rounded-full bg-slate-200">
                    <span className="block h-1 w-1/5 rounded-full bg-sky-400" />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CallNoteComposer({
  record,
  number,
  name,
  durationSeconds,
  disposition,
  onDisposition,
  body,
  savedTo,
  onChange,
  onSave,
  onSkip,
}: {
  record: SoftphoneRecord | null;
  number: string;
  name?: string;
  durationSeconds: number;
  disposition: CallStatus;
  onDisposition: (status: CallStatus) => void;
  body: string;
  savedTo: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  const displayName = record?.name || name || "Unknown";

  return (
    <div className="space-y-2.5 py-0.5 pb-2">
      <div className="border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5A32A3] text-white">
            <Phone className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold text-slate-900">
              Call Summary
            </h3>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 pb-2.5 text-center">
        <p className="truncate text-[14px] font-semibold text-slate-900">
          {displayName}
        </p>
        <p className="text-[12px] text-slate-500">{number}</p>
        <p className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-rose-600">
          <PhoneOff className="h-3.5 w-3.5" />
          Call Ended
        </p>
        <p className="mt-2 inline-flex rounded-lg bg-slate-100 px-3 py-1 text-[12px] font-medium text-slate-600">
          {formatDurationClock(durationSeconds)}
        </p>
      </div>

      <div className="border-b border-slate-100 pb-2.5">
        <p className="mb-2 flex items-center gap-1 text-[13px] font-semibold text-slate-800">
          Custom Disposition
          <span title="How this call ended">
            <Info className="h-3.5 w-3.5 text-slate-400" />
          </span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DISPOSITIONS.map((item) => {
            const active = disposition === item.status;
            return (
              <button
                key={item.status}
                type="button"
                onClick={() => onDisposition(item.status)}
                className={cn(
                  "h-9 rounded-lg border text-[12px] font-medium",
                  active
                    ? "border-[#5A32A3] bg-[#F3ECFB] text-[#5A32A3]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">Call note</h3>
        <textarea
          value={body}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="What happened on this call?"
          className="mt-2 w-full resize-none rounded-lg border border-violet-300 bg-white px-2.5 py-2 text-[12px] outline-none focus:ring-1 focus:ring-violet-500"
        />
        {savedTo ? (
          <p className="mt-1 text-[11px] font-medium text-emerald-600">
            Saved on {savedTo}
          </p>
        ) : null}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="h-8 flex-1 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={!body.trim()}
            onClick={onSave}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-[#5A32A3] text-[12px] font-semibold text-white disabled:opacity-40"
          >
            <StickyNote className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
        className || "bg-slate-100 text-slate-600",
      )}
    >
      {initials}
    </span>
  );
}

function Action({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 py-1 text-slate-600 hover:text-slate-900"
    >
      <Icon className="h-4 w-4" />
      <span className="text-[8px] leading-none">{label}</span>
    </button>
  );
}

function IconTiny({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

function initialsSafe(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function TabBtn({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 py-1 text-slate-500"
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full",
          active && "bg-slate-100 text-slate-800",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-[9px] leading-none">{label}</span>
    </button>
  );
}
