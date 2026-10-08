"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { Bell, Pencil, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ListboxSelect } from "@/components/booking/LimitsControls";
import { NotifyVariableMenu } from "@/components/booking/NotifyVariableMenu";
import {
  dateFormatOptions,
  insertAtSelection,
  normalizeDateFormat,
} from "@/lib/booking/notify-variables";
import {
  DEFAULT_NOTIFICATIONS,
  NOTIFY_CHANNELS,
  type NotificationRow,
  type NotifyChannel,
} from "@/lib/booking/notify-prefs";
import { sendNotifyTest } from "@/lib/booking/notify";
import { WorkspacePortal } from "@/components/shared/WorkspacePortal";

export type { NotificationRow, NotifyChannel };
export { DEFAULT_NOTIFICATIONS };

const BRAND = "var(--brand-primary)";

function Pill({
  label,
  on,
  onClick,
}: {
  label: NotifyChannel;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        on
          ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
          : "border-slate-200 bg-white text-slate-400",
      )}
    >
      {label}
    </button>
  );
}

export function BookingNotificationsStep({
  initial,
  onBack,
  onNext,
}: {
  initial?: NotificationRow[];
  onBack: () => void;
  onNext: (rows: NotificationRow[]) => void;
}) {
  const [rows, setRows] = useState<NotificationRow[]>(
    initial ?? DEFAULT_NOTIFICATIONS,
  );
  const [editing, setEditing] = useState<NotificationRow | null>(null);

  function toggleChannel(id: string, channel: NotifyChannel) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              channels: { ...r.channels, [channel]: !r.channels[channel] },
            }
          : r,
      ),
    );
  }

  return (
    <div className="mx-auto w-full max-w-[920px] pb-8">
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-7">
          <h1 className="text-[18px] font-bold text-slate-900">
            Notifications
          </h1>
        </div>

        <div className="divide-y divide-[#F3F4F6]">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-start gap-3 px-5 py-4 sm:px-7"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-bold text-slate-800">
                    {row.title}
                  </p>
                  {NOTIFY_CHANNELS.map((c) => (
                    <Pill
                      key={c}
                      label={c}
                      on={row.channels[c]}
                      onClick={() => toggleChannel(row.id, c)}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(row)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-primary)]"
                aria-label={`Edit ${row.title}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-[#E5E7EB] px-5 py-3 sm:px-7">
          <p className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Status labels:</span>{" "}
            Enabled (purple text/border), Disabled (gray text/border).
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-10 min-w-[96px] rounded-lg border border-[#E5E7EB] bg-white px-6 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onNext(rows)}
          className="h-10 min-w-[96px] rounded-lg px-6 text-[13px] font-semibold text-white hover:brightness-110"
          style={{ backgroundColor: BRAND }}
        >
          Next
        </button>
      </div>

      {editing ? (
        <NotificationEditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)));
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

const LABEL = "text-[12px] font-semibold text-slate-700";

const INPUT =
  "h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/10";

const SECONDARY_BUTTON =
  "h-10 shrink-0 rounded-lg border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

function Required() {
  return <span className="text-rose-500">*</span>;
}

/**
 * One bordered message editor: a slim toolbar (Reset to default on the left,
 * `tools` such as Insert Variable on the right), the text, and a footer line
 * with an optional hint and the character / word count.
 */
function MessageBox({
  id,
  value,
  rows,
  textareaRef,
  onChange,
  onReset,
  tools,
  hint,
}: {
  id: string;
  value: string;
  rows: number;
  textareaRef?: Ref<HTMLTextAreaElement>;
  onChange: (value: string) => void;
  onReset: () => void;
  tools?: ReactNode;
  hint?: string;
}) {
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white transition-colors focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/10">
      <div className="flex items-center justify-between gap-2 border-b border-[#E5E7EB] bg-slate-50 px-2 py-1.5">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-white hover:text-[var(--brand-primary)]"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset to default
        </button>
        {tools}
      </div>
      <textarea
        id={id}
        ref={textareaRef}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="block w-full resize-y bg-white px-3.5 py-3 text-[13px] leading-6 text-slate-800 outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t border-[#EEF0F3] px-3.5 py-2 text-[11px] text-slate-400">
        <span>{hint}</span>
        <span>
          {value.length} characters | {words} words
        </span>
      </div>
    </div>
  );
}

/** "Send a test" row: the address or number, the button beside it, and the outcome below. */
function TestSend({
  id,
  label,
  value,
  placeholder,
  onChange,
  buttonLabel,
  busy,
  onSend,
  note,
  failed,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  buttonLabel: string;
  busy: boolean;
  onSend: () => void;
  note: string;
  failed: boolean;
}) {
  return (
    <div className="border-t border-[#EEF0F3] pt-5">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(INPUT, "sm:flex-1")}
        />
        <button
          type="button"
          disabled={busy}
          onClick={onSend}
          className={SECONDARY_BUTTON}
        >
          {busy ? "Sending…" : buttonLabel}
        </button>
      </div>
      {note ? (
        <p
          role="status"
          className={cn(
            "mt-2 text-[12px]",
            failed ? "text-rose-600" : "text-emerald-700",
          )}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Edits one notification's template. `channels` are the tabs offered; Email
 * only by default. The SMS and WhatsApp panels pass their own channel so their
 * message text stays editable.
 */
export function NotificationEditModal({
  row,
  channels = ["Email"],
  onClose,
  onSave,
}: {
  row: NotificationRow;
  channels?: NotifyChannel[];
  onClose: () => void;
  onSave: (row: NotificationRow) => void;
}) {
  const tabs: NotifyChannel[] = channels.length ? channels : ["Email"];
  const [draft, setDraft] = useState(row);
  const [tab, setTab] = useState<NotifyChannel>(tabs[0]);
  const [testPhone, setTestPhone] = useState("+12345678901");
  const [testNote, setTestNote] = useState("");
  const [testFailed, setTestFailed] = useState(false);
  const [testing, setTesting] = useState(false);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const pressedOnBackdrop = useRef(false);
  const titleId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const smsId = useId();
  const testPhoneId = useId();
  const dateFormat = normalizeDateFormat(draft.dateFormat);
  // Each row previews today's date in that style, e.g. "dd-MMM-yyyy (02-Oct-2026)".
  const dateOptions = useMemo(() => dateFormatOptions(new Date()), []);
  const enabled = draft.channels[tab];
  const defaults = DEFAULT_NOTIFICATIONS.find((n) => n.id === row.id);
  // Escape closes the window. A dropdown or the variable menu that is open
  // takes the key first (they mark it handled), so one press closes one layer.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Drops a variable at the caret (or over the selection) and puts the caret after it. */
  function insertToken(field: "emailSubject" | "emailBody", token: string) {
    const el = field === "emailSubject" ? subjectRef.current : bodyRef.current;
    const next = insertAtSelection(
      draft[field],
      el?.selectionStart,
      el?.selectionEnd,
      token,
    );
    setDraft((d) => ({ ...d, [field]: next.value }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.caret, next.caret);
    });
  }

  async function runTest(channel: NotifyChannel) {
    setTesting(true);
    setTestNote("");
    setTestFailed(false);
    try {
      await sendNotifyTest({
        channel,
        row: draft,
        email: "",
        phone: testPhone,
      });
      setTestNote(`${channel} test sent.`);
    } catch (err) {
      setTestNote(err instanceof Error ? err.message : "Test send failed");
      setTestFailed(true);
    } finally {
      setTesting(false);
    }
  }

  return (
    <WorkspacePortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-[1px] sm:items-center sm:p-6"
        // Closing needs the press and the release on the backdrop: dragging to
        // select text and letting go outside the window must not throw away edits.
        onMouseDown={(event) => {
          pressedOnBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && pressedOnBackdrop.current)
            onClose();
          pressedOnBackdrop.current = false;
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex max-h-[92vh] w-full max-w-[800px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-6 py-4">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-[16px] font-semibold text-slate-900"
              >
                Edit {row.title}
              </h2>
              <p className="mt-0.5 text-[12.5px] leading-5 text-slate-500">
                {row.info}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="flex items-end justify-between gap-3 border-b border-[#E5E7EB]">
              <div className="flex gap-5">
                {tabs.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTab(c)}
                    className={cn(
                      "-mb-px border-b-2 pb-2.5 text-[13px] font-semibold transition-colors",
                      tab === c
                        ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                        : "border-transparent text-slate-500 hover:text-slate-800",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <label className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-600">
                Enabled
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      channels: { ...d.channels, [tab]: !d.channels[tab] },
                    }))
                  }
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40 focus-visible:ring-offset-2",
                    enabled ? "bg-[var(--brand-primary)]" : "bg-slate-300",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      enabled && "translate-x-5",
                    )}
                  />
                </button>
              </label>
            </div>

            {tab === "Email" ? (
              <div className="space-y-5">
                <div>
                  <label htmlFor={subjectId} className={LABEL}>
                    Subject
                    <Required />
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id={subjectId}
                      ref={subjectRef}
                      value={draft.emailSubject}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          emailSubject: e.target.value,
                        }))
                      }
                      className={cn(INPUT, "pr-[150px]")}
                    />
                    <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
                      <NotifyVariableMenu
                        onInsert={(token) => insertToken("emailSubject", token)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <label htmlFor={bodyId} className={LABEL}>
                      Email body
                      <Required />
                    </label>
                    <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 sm:w-auto sm:flex-nowrap">
                      <span className="text-[12px] text-slate-500">
                        Select Date Format For Mail:
                      </span>
                      <ListboxSelect
                        compact
                        label="Select date format for mail"
                        value={dateFormat}
                        options={dateOptions}
                        onChange={(value) =>
                          setDraft((d) => ({ ...d, dateFormat: value }))
                        }
                        className="w-full sm:w-[230px]"
                      />
                    </div>
                  </div>
                  <MessageBox
                    id={bodyId}
                    textareaRef={bodyRef}
                    value={draft.emailBody}
                    rows={9}
                    onChange={(emailBody) =>
                      setDraft((d) => ({ ...d, emailBody }))
                    }
                    onReset={() =>
                      setDraft((d) => ({
                        ...d,
                        emailBody: defaults?.emailBody ?? d.emailBody,
                      }))
                    }
                    tools={
                      <NotifyVariableMenu
                        onInsert={(token) => insertToken("emailBody", token)}
                      />
                    }
                    hint="Dates in the message follow the format above."
                  />
                </div>
              </div>
            ) : tab === "SMS" ? (
              <div className="space-y-5">
                <div>
                  <label htmlFor={smsId} className={LABEL}>
                    SMS message
                    <Required />
                  </label>
                  <div className="mt-1.5">
                    <MessageBox
                      id={smsId}
                      value={draft.smsBody}
                      rows={5}
                      onChange={(smsBody) =>
                        setDraft((d) => ({ ...d, smsBody }))
                      }
                      onReset={() =>
                        setDraft((d) => ({
                          ...d,
                          smsBody: defaults?.smsBody ?? d.smsBody,
                        }))
                      }
                    />
                  </div>
                </div>

                <TestSend
                  id={testPhoneId}
                  label="Test SMS (enter phone number with country code)"
                  value={testPhone}
                  onChange={setTestPhone}
                  buttonLabel="Send test SMS"
                  busy={testing}
                  onSend={() => void runTest("SMS")}
                  note={testNote}
                  failed={testFailed}
                />
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 px-4 py-4 text-[13px] leading-6 text-slate-600">
                <p>
                  {tab === "In-app"
                    ? "In-app alerts go to the assigned consultant’s FinConnex notification inbox."
                    : "WhatsApp uses the same message as SMS and sends to the guest phone."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={testing}
                    onClick={() =>
                      void runTest(tab === "WhatsApp" ? "WhatsApp" : "In-app")
                    }
                    className={SECONDARY_BUTTON}
                  >
                    {tab === "WhatsApp"
                      ? "Send test WhatsApp"
                      : "Send test in-app"}
                  </button>
                  {testNote ? (
                    <p
                      role="status"
                      className={cn(
                        "text-[12px]",
                        testFailed ? "text-rose-600" : "text-emerald-700",
                      )}
                    >
                      {testNote}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-[#E5E7EB] px-6 py-4">
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="h-10 rounded-lg px-6 text-[13px] font-semibold text-white transition hover:brightness-110"
              style={{ backgroundColor: BRAND }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </WorkspacePortal>
  );
}
