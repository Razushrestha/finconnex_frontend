"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  Info,
  Pencil,
  Tag,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_NOTIFICATIONS,
  NOTIFY_CHANNELS,
  type NotificationRow,
  type NotifyChannel,
} from "@/lib/booking/notify-prefs";
import { sendNotifyTest } from "@/lib/booking/notify";

export type { NotificationRow, NotifyChannel };
export { DEFAULT_NOTIFICATIONS };

const BRAND = "#5A32A3";

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
          ? "border-[#5A32A3]/40 bg-[#F3ECFB] text-[#5A32A3]"
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
          ? { ...r, channels: { ...r.channels, [channel]: !r.channels[channel] } }
          : r,
      ),
    );
  }

  return (
    <div className="mx-auto w-full max-w-[920px] pb-8">
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-7">
          <h1 className="text-[18px] font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Purple channels send. Email goes to the guest, In-app to the FinConnex
            inbox, SMS and WhatsApp to the guest phone.
          </p>
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
                <p className="mt-1 text-[12px] text-slate-500">
                  {row.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(row)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
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

function NotificationEditModal({
  row,
  onClose,
  onSave,
}: {
  row: NotificationRow;
  onClose: () => void;
  onSave: (row: NotificationRow) => void;
}) {
  const [draft, setDraft] = useState(row);
  const [tab, setTab] = useState<NotifyChannel>("Email");
  const [contactOpen, setContactOpen] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("+12345678901");
  const [testNote, setTestNote] = useState("");
  const [testing, setTesting] = useState(false);

  const enabled = draft.channels[tab];
  const words = useMemo(
    () => draft.emailBody.trim().split(/\s+/).filter(Boolean).length,
    [draft.emailBody],
  );
  const smsWords = useMemo(
    () => draft.smsBody.trim().split(/\s+/).filter(Boolean).length,
    [draft.smsBody],
  );

  async function runTest(channel: NotifyChannel) {
    setTesting(true);
    setTestNote("");
    try {
      await sendNotifyTest({
        channel,
        row: draft,
        email: testEmail,
        phone: testPhone,
      });
      setTestNote(`${channel} test sent.`);
    } catch (err) {
      setTestNote(err instanceof Error ? err.message : "Test send failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-[1px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        className="flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#E5E7EB] px-5 py-4">
          <h2 className="pr-8 text-[16px] font-bold text-slate-900">
            Edit {row.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#F3ECFB] px-3 py-2.5 text-[12px] text-[#5A32A3]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            {row.info}
          </div>

          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#E5E7EB]">
            <div className="flex gap-4">
              {NOTIFY_CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setTab(c)}
                  className={cn(
                    "border-b-2 pb-2 text-[13px] font-semibold",
                    tab === c
                      ? "border-[#5A32A3] text-[#5A32A3]"
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
                  "relative h-6 w-11 rounded-full",
                  enabled ? "bg-[#5A32A3]" : "bg-slate-300",
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

          <p className="mb-2 text-[13px] font-semibold text-slate-800">
            Who should receive this notification?
          </p>
          <div className="mb-4 overflow-hidden rounded-lg border border-[#E5E7EB]">
            <div className="border-b border-[#F3F4F6]">
              <div className="flex items-center justify-between px-3 py-2.5">
                <label className="flex items-center gap-2 text-[13px] font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={draft.notifyContact}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, notifyContact: e.target.checked }))
                    }
                    className="accent-[#5A32A3]"
                  />
                  Contact
                </label>
                <button
                  type="button"
                  onClick={() => setContactOpen((v) => !v)}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400 transition-transform",
                      contactOpen && "rotate-180",
                    )}
                  />
                </button>
              </div>
              {contactOpen && draft.notifyContact && tab === "Email" ? (
                <div className="space-y-3 border-t border-[#F3F4F6] px-3 py-3">
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-semibold text-slate-600">
                      Subject<span className="text-rose-500">*</span>
                    </span>
                    <div className="relative">
                      <input
                        value={draft.emailSubject}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, emailSubject: e.target.value }))
                        }
                        className="h-10 w-full rounded-lg border border-[#E5E7EB] pr-9 pl-3 text-[13px] outline-none focus:border-[#5A32A3]/40"
                      />
                      <Tag className="absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-1 flex items-center justify-between text-[12px] font-semibold text-slate-600">
                      <span>
                        Email body<span className="text-rose-500">*</span>
                      </span>
                      <button
                        type="button"
                        className="font-medium text-[#5A32A3] hover:underline"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            emailBody:
                              DEFAULT_NOTIFICATIONS.find((n) => n.id === row.id)
                                ?.emailBody ?? d.emailBody,
                          }))
                        }
                      >
                        Reset to default
                      </button>
                    </span>
                    <textarea
                      value={draft.emailBody}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, emailBody: e.target.value }))
                      }
                      rows={7}
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-[#5A32A3]/40"
                    />
                    <p className="mt-1 text-right text-[11px] text-slate-400">
                      {draft.emailBody.length} characters | {words} words
                    </p>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-semibold text-slate-600">
                      Test email
                    </span>
                    <input
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Enter the recipient's email address for testing"
                      className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-[13px] outline-none"
                    />
                    <button
                      type="button"
                      disabled={testing}
                      onClick={() => void runTest("Email")}
                      className="mt-2 h-8 rounded-md border border-[#E5E7EB] px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Send test email
                    </button>
                    {testNote ? (
                      <p className="mt-1 text-[12px] text-slate-500">{testNote}</p>
                    ) : null}
                  </label>
                </div>
              ) : null}
              {contactOpen && draft.notifyContact && tab === "SMS" ? (
                <div className="space-y-3 border-t border-[#F3F4F6] px-3 py-3">
                  <label className="block">
                    <span className="mb-1 flex items-center justify-between text-[12px] font-semibold text-slate-600">
                      <span>
                        SMS message<span className="text-rose-500">*</span>
                      </span>
                      <button
                        type="button"
                        className="font-medium text-[#5A32A3] hover:underline"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            smsBody:
                              DEFAULT_NOTIFICATIONS.find((n) => n.id === row.id)
                                ?.smsBody ?? d.smsBody,
                          }))
                        }
                      >
                        Reset to default
                      </button>
                    </span>
                    <div className="relative">
                      <textarea
                        value={draft.smsBody}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, smsBody: e.target.value }))
                        }
                        rows={4}
                        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 pr-8 text-[13px] outline-none focus:border-[#5A32A3]/40"
                      />
                      <Tag className="absolute right-3 bottom-3 h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <p className="mt-1 text-right text-[11px] text-slate-400">
                      {draft.smsBody.length} characters | {smsWords} words
                    </p>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-semibold text-slate-600">
                      Test SMS (enter phone number with country code)
                    </span>
                    <input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-[13px] outline-none"
                    />
                    <button
                      type="button"
                      disabled={testing}
                      onClick={() => void runTest("SMS")}
                      className="mt-2 h-8 rounded-md border border-[#E5E7EB] px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Send test SMS
                    </button>
                    {testNote ? (
                      <p className="mt-1 text-[12px] text-slate-500">{testNote}</p>
                    ) : null}
                  </label>
                </div>
              ) : null}
              {contactOpen &&
              draft.notifyContact &&
              (tab === "In-app" || tab === "WhatsApp") ? (
                <div className="space-y-3 border-t border-[#F3F4F6] px-3 py-4 text-[13px] text-slate-500">
                  {tab === "In-app"
                    ? "In-app alerts go to the assigned consultant’s FinConnex notification inbox."
                    : "WhatsApp uses the same message as SMS and sends to the guest phone."}
                  {tab === "WhatsApp" ? (
                    <button
                      type="button"
                      disabled={testing}
                      onClick={() => void runTest("WhatsApp")}
                      className="mt-2 h-8 rounded-md border border-[#E5E7EB] px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Send test WhatsApp
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={testing}
                      onClick={() => void runTest("In-app")}
                      className="mt-2 h-8 rounded-md border border-[#E5E7EB] px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Send test in-app
                    </button>
                  )}
                  {testNote ? (
                    <p className="text-[12px] text-slate-500">{testNote}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <label className="flex items-center justify-between px-3 py-2.5 text-[13px] font-medium text-slate-800">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.notifyUser}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, notifyUser: e.target.checked }))
                  }
                  className="accent-[#5A32A3]"
                />
                Assigned user
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E5E7EB] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-[#E5E7EB] px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="h-9 rounded-lg px-4 text-[13px] font-semibold text-white hover:brightness-110"
            style={{ backgroundColor: BRAND }}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
