"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Clock,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  PenLine,
  Send,
  Table,
  WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActiveSignatureId,
  listSignatureProfiles,
  replaceSignatureInHtml,
  setActiveSignatureId,
} from "@/lib/emails/signature";

type SendAction = "now" | "schedule" | "follow-up" | "deal-stage";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function tomorrowNine() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

function nextMondayNine() {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? 1 : 8 - day));
  date.setHours(9, 0, 0, 0);
  return date;
}

const EMOJIS = ["👍", "🙏", "😊", "🎉", "✅", "📅"];

interface ComposeActionBarProps {
  sending?: boolean;
  improving?: boolean;
  onAttach: () => void;
  onInsertImage: (file: File) => void;
  onInsertTable: () => void;
  onInsertEmoji: (emoji: string) => void;
  onSignature: (html: string) => void;
  onImprove: () => void;
  body: string;
  onReminder: () => void;
  onSaveDraft: () => void;
  onSend: (action: SendAction, at?: Date) => void;
}

export function ComposeActionBar({
  sending,
  improving,
  onAttach,
  onInsertImage,
  onInsertTable,
  onInsertEmoji,
  onSignature,
  onImprove,
  body,
  onReminder,
  onSaveDraft,
  onSend,
}: ComposeActionBarProps) {
  const [attachOpen, setAttachOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);
  const [followOpen, setFollowOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(() => toLocalInput(tomorrowNine()));
  const attachRef = useRef<HTMLDivElement>(null);
  const insertRef = useRef<HTMLDivElement>(null);
  const sigRef = useRef<HTMLDivElement>(null);
  const followRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const profiles = listSignatureProfiles();
  const activeId = typeof window === "undefined" ? "own" : getActiveSignatureId();
  const scheduleDate = fromLocalInput(scheduleAt);
  const scheduleValid = Boolean(scheduleDate && scheduleDate.getTime() > Date.now());

  function closeMenus() {
    setAttachOpen(false);
    setInsertOpen(false);
    setSigOpen(false);
    setFollowOpen(false);
    setSendOpen(false);
    setScheduleOpen(false);
  }

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const t = event.target as Node;
      if (attachOpen && !attachRef.current?.contains(t)) setAttachOpen(false);
      if (insertOpen && !insertRef.current?.contains(t)) setInsertOpen(false);
      if (sigOpen && !sigRef.current?.contains(t)) setSigOpen(false);
      if (followOpen && !followRef.current?.contains(t)) setFollowOpen(false);
      if ((sendOpen || scheduleOpen) && !sendRef.current?.contains(t)) {
        setSendOpen(false);
        setScheduleOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [attachOpen, insertOpen, sigOpen, followOpen, sendOpen, scheduleOpen]);

  function scheduleFor(date: Date) {
    closeMenus();
    onSend("schedule", date);
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-[#F7F8FA] px-4 py-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="relative" ref={attachRef}>
          <ChipButton
            title="Attach"
            active={attachOpen}
            onClick={() => {
              closeMenus();
              setAttachOpen((v) => !v);
            }}
          >
            <Paperclip className="h-3.5 w-3.5" />
            Attach
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </ChipButton>
          {attachOpen ? (
            <Menu>
              <MenuItem
                onClick={() => {
                  onAttach();
                  setAttachOpen(false);
                }}
              >
                <Paperclip className="h-3.5 w-3.5" />
                From this computer
              </MenuItem>
            </Menu>
          ) : null}
        </div>

        <div className="relative" ref={insertRef}>
          <ChipButton
            title="Insert"
            active={insertOpen}
            onClick={() => {
              closeMenus();
              setInsertOpen((v) => !v);
            }}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Insert
          </ChipButton>
          {insertOpen ? (
            <Menu>
              <MenuItem onClick={() => imageRef.current?.click()}>
                <ImageIcon className="h-3.5 w-3.5" />
                Image
              </MenuItem>
              <MenuItem
                onClick={() => {
                  onInsertTable();
                  setInsertOpen(false);
                }}
              >
                <Table className="h-3.5 w-3.5" />
                Table
              </MenuItem>
              <div className="flex gap-0.5 border-t border-slate-100 px-2 py-1.5">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onInsertEmoji(emoji);
                      setInsertOpen(false);
                    }}
                    className="h-7 w-7 rounded hover:bg-slate-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </Menu>
          ) : null}
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                onInsertImage(file);
                setInsertOpen(false);
              }
            }}
          />
        </div>

        <div className="relative" ref={sigRef}>
          <ChipButton
            title="Signature"
            active={sigOpen}
            onClick={() => {
              closeMenus();
              setSigOpen((v) => !v);
            }}
          >
            <PenLine className="h-3.5 w-3.5" />
            Signature
          </ChipButton>
          {sigOpen ? (
            <Menu className="w-64">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    setActiveSignatureId(profile.id);
                    onSignature(replaceSignatureInHtml(body, profile.body));
                    setSigOpen(false);
                  }}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50"
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      profile.id === activeId ? "text-[#5A32A3]" : "text-transparent",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-slate-800">
                      {profile.name}
                    </span>
                    <span className="block truncate text-[10px] text-slate-500">{profile.email}</span>
                  </span>
                </button>
              ))}
            </Menu>
          ) : null}
        </div>

        <ChipButton
          title="Ask me to..."
          emphasize
          disabled={improving}
          onClick={onImprove}
        >
          {improving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5" />}
          Ask me to...
        </ChipButton>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative" ref={followRef}>
          <button
            type="button"
            onClick={() => {
              closeMenus();
              setFollowOpen((v) => !v);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Bell className="h-3.5 w-3.5 text-[#5A32A3]" />
            Follow up
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>
          {followOpen ? (
            <Menu align="right">
              <MenuItem
                onClick={() => {
                  onReminder();
                  setFollowOpen(false);
                }}
              >
                Create follow-up
              </MenuItem>
              <MenuItem
                onClick={() => {
                  onSend("follow-up");
                  setFollowOpen(false);
                }}
              >
                Send & create follow-up
              </MenuItem>
            </Menu>
          ) : null}
        </div>

        <div className="relative" ref={sendRef}>
          <div className="inline-flex h-9 overflow-hidden rounded-lg bg-[#5A32A3] shadow-sm">
            <button
              type="button"
              disabled={sending}
              onClick={() => onSend("now")}
              className="inline-flex h-9 items-center gap-1.5 px-4 text-[13px] font-semibold text-white hover:bg-[#4a2888] disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send"}
              <Send className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={sending}
              aria-label="Send options"
              onClick={() => {
                const next = !(sendOpen || scheduleOpen);
                closeMenus();
                setSendOpen(next);
                setScheduleOpen(false);
              }}
              className="border-l border-white/20 px-2 text-white hover:bg-[#4a2888] disabled:opacity-50"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {sendOpen && !scheduleOpen ? (
            <Menu align="right" className="w-56">
              <MenuItem
                onClick={() => {
                  closeMenus();
                  onSend("now");
                }}
              >
                <Send className="h-3.5 w-3.5 text-[#5A32A3]" />
                Send now
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setScheduleAt(toLocalInput(tomorrowNine()));
                  setScheduleOpen(true);
                }}
              >
                <Clock className="h-3.5 w-3.5 text-[#5A32A3]" />
                Schedule send
              </MenuItem>
              <MenuItem onClick={() => scheduleFor(tomorrowNine())}>
                <Clock className="h-3.5 w-3.5 text-[#5A32A3]" />
                Tomorrow 9:00 AM
              </MenuItem>
              <MenuItem onClick={() => scheduleFor(nextMondayNine())}>
                <Clock className="h-3.5 w-3.5 text-[#5A32A3]" />
                Next Monday 9:00 AM
              </MenuItem>
              <div className="my-1 border-t border-slate-100" />
              <MenuItem
                onClick={() => {
                  closeMenus();
                  onSaveDraft();
                }}
              >
                Save draft
              </MenuItem>
            </Menu>
          ) : null}

          {scheduleOpen ? (
            <div className="absolute right-0 bottom-10 z-30 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <p className="text-[13px] font-semibold text-slate-800">Schedule send</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Pick a date and time. The email will sit in Scheduled until then.
              </p>
              <input
                type="datetime-local"
                min={toLocalInput(new Date())}
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
                className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-[#5A32A3]"
              />
              {!scheduleValid ? (
                <p className="mt-1 text-[11px] text-red-600">Choose a time in the future.</p>
              ) : null}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScheduleOpen(false);
                    setSendOpen(true);
                  }}
                  className="h-8 rounded-md px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!scheduleValid}
                  onClick={() => {
                    if (scheduleDate) scheduleFor(scheduleDate);
                  }}
                  className="h-8 rounded-md bg-[#5A32A3] px-3 text-[12px] font-semibold text-white hover:bg-[#4a2888] disabled:opacity-40"
                >
                  Schedule
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChipButton({
  title,
  onClick,
  children,
  active,
  emphasize,
  disabled,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  emphasize?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-[12px] font-medium shadow-sm disabled:opacity-50",
        emphasize
          ? "border-violet-200 text-[#5A32A3]"
          : "border-slate-200 text-slate-700",
        active && "border-violet-300 bg-violet-50",
        !emphasize && "[&_svg]:text-[#5A32A3]",
      )}
    >
      {children}
    </button>
  );
}

function Menu({
  children,
  className,
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "absolute bottom-10 z-30 min-w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg",
        align === "right" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

function MenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}
