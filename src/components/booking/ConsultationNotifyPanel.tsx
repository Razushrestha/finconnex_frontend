"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  UserX,
  XCircle,
} from "lucide-react";
import { loadSettingsValues } from "@/lib/settings/settings-store";
import {
  mergeNotificationPrefs,
  type NotificationRow,
  type NotifyChannel,
} from "@/lib/booking/notify-prefs";
import type { BookingPage } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

const BRAND = "#5A32A3";

export const NOTIFY_PANELS = [
  { id: "email", title: "Email", icon: Mail },
  { id: "sms", title: "SMS", icon: MessageSquare },
  { id: "calendar", title: "Calendar Invites", icon: CalendarDays },
  { id: "whatsapp", title: "WhatsApp", icon: MessageCircle },
] as const;

export type NotifyPanelId = (typeof NOTIFY_PANELS)[number]["id"];

const STAGE_TILES: {
  id: NotificationRow["id"];
  label: string;
  icon: typeof Clock;
}[] = [
  { id: "confirmed", label: "Booked", icon: Clock },
  { id: "reschedule", label: "Rescheduled", icon: RefreshCw },
  { id: "cancel", label: "Canceled", icon: XCircle },
  { id: "followup", label: "Completed", icon: CheckCircle2 },
  { id: "noshow", label: "No Show", icon: UserX },
];

function channelForPanel(panel: NotifyPanelId): NotifyChannel | null {
  if (panel === "email") return "Email";
  if (panel === "sms") return "SMS";
  if (panel === "whatsapp") return "WhatsApp";
  return null;
}

function headingFor(panel: NotifyPanelId) {
  if (panel === "email") return "Email Notifications and Reminders";
  if (panel === "sms") return "SMS Notifications and Reminders";
  if (panel === "whatsapp") return "WhatsApp Notifications and Reminders";
  return "Calendar Invites";
}

function smsGatewayConnected() {
  if (typeof window === "undefined") return false;
  const values = loadSettingsValues("integrations/twilio");
  const raw = values.connected ?? values.twilio_connected ?? values.enabled;
  return raw === true || raw === "true" || raw === 1 || raw === "1";
}

export function ConsultationNotifyPanel({
  panel,
  page,
  onSaved,
}: {
  panel: NotifyPanelId;
  page: BookingPage;
  onSaved: (page: BookingPage) => void;
}) {
  const [audience, setAudience] = useState<"customer" | "user">("customer");
  const [reminders, setReminders] = useState<number[]>(
    page.notifyReminders?.map((row) => row.minutes) ?? [30],
  );
  const rows = useMemo(
    () => mergeNotificationPrefs(page.notifyPrefs as NotificationRow[] | undefined),
    [page.notifyPrefs],
  );
  const channel = channelForPanel(panel);
  const who = audience === "customer" ? "Customer" : "User";
  const gatewayOn = smsGatewayConnected();

  function persist(nextRows: NotificationRow[], nextReminders = reminders) {
    onSaved({
      ...page,
      notifyPrefs: nextRows,
      notifyReminders: nextReminders.map((minutes) => ({ minutes })),
    });
  }

  function tileOn(id: NotificationRow["id"]) {
    const row = rows.find((item) => item.id === id);
    if (!row || !channel) return false;
    const forAudience =
      audience === "customer" ? row.notifyContact : row.notifyUser;
    return row.channels[channel] && forAudience;
  }

  function toggleTile(id: NotificationRow["id"]) {
    if (!channel) return;
    const enabled = tileOn(id);
    persist(
      rows.map((row) => {
        if (row.id !== id) return row;
        const nextOn = !enabled;
        const otherStillOn =
          audience === "customer" ? row.notifyUser : row.notifyContact;
        return {
          ...row,
          channels: {
            ...row.channels,
            [channel]: nextOn || otherStillOn,
          },
          notifyContact: audience === "customer" ? nextOn : row.notifyContact,
          notifyUser: audience === "user" ? nextOn : row.notifyUser,
        };
      }),
    );
  }

  return (
    <div className="px-5 py-5 sm:px-6">
      <h2 className="text-[16px] font-semibold text-slate-900">
        {headingFor(panel)}
      </h2>

      {panel !== "calendar" ? (
        <>
          <div className="mt-4 flex gap-5 border-b border-slate-200 text-[13px] font-semibold">
            {(["customer", "user"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setAudience(item)}
                className={cn(
                  "-mb-px border-b-2 pb-2",
                  audience === item
                    ? "border-[#5A32A3] text-[#5A32A3]"
                    : "border-transparent text-slate-500",
                )}
              >
                {item === "customer" ? "To Customer" : "To User"}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <p className="text-[13px] font-semibold text-slate-800">
              Notifications
            </p>
            <p className="mt-1 text-[12px] text-slate-500">
              Send customized {panel === "email" ? "email" : panel === "whatsapp" ? "WhatsApp" : "SMS"}{" "}
              updates to {who} at every stage of an appointment.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {STAGE_TILES.map((tile) => {
                const Icon = tile.icon;
                const on = tileOn(tile.id);
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => toggleTile(tile.id)}
                    className={cn(
                      "flex h-[92px] w-[104px] flex-col items-center justify-center gap-2 rounded-xl border text-[12px] font-medium",
                      on
                        ? "border-[#5A32A3]/35 bg-[#F3ECFB] text-[#5A32A3]"
                        : "border-dashed border-slate-200 bg-white text-slate-400",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {tile.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[13px] font-semibold text-slate-800">Reminders</p>
            <p className="mt-1 text-[12px] text-slate-500">
              Remind {who} of their upcoming appointment via{" "}
              {panel === "email" ? "email" : panel === "whatsapp" ? "WhatsApp" : "SMS"}.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              {reminders.map((minutes, index) => (
                <div key={`${minutes}-${index}`}>
                  <p className="mb-1 text-[12px] text-slate-500">Before</p>
                  <div className="flex overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                    <input
                      type="number"
                      min={1}
                      value={minutes}
                      onChange={(e) => {
                        const next = [...reminders];
                        next[index] = Math.max(1, Number(e.target.value) || 1);
                        setReminders(next);
                        persist(rows, next);
                      }}
                      className="h-10 w-16 px-2 text-[13px] outline-none"
                    />
                    <span className="flex h-10 items-center border-l border-[#E5E7EB] px-3 text-[13px] text-slate-500">
                      Minutes
                    </span>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const next = [...reminders, 30];
                  setReminders(next);
                  persist(rows, next);
                }}
                className="mb-1 text-[13px] font-semibold text-[#5A32A3] hover:underline"
              >
                + Add Reminders
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-5">
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
            <input
              type="checkbox"
              checked={page.calendarInvites !== false}
              onChange={(e) =>
                onSaved({ ...page, calendarInvites: e.target.checked })
              }
              className="h-4 w-4 accent-[#5A32A3]"
            />
            Send calendar invites for confirmed appointments
          </label>
          <textarea
            value={page.inviteNotes ?? ""}
            onChange={(e) => onSaved({ ...page, inviteNotes: e.target.value })}
            placeholder="Optional notes on the invite"
            className="mt-3 min-h-[96px] w-full max-w-xl rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] outline-none focus:border-[#5A32A3]/40"
          />
        </div>
      )}

      {panel === "sms" ? (
        <div className="mt-8">
          <p className="text-[13px] font-semibold text-slate-800">
            SMS Configurations
          </p>
          {!gatewayOn ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="flex items-start gap-2 text-[12px] text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                To send SMS alerts, first integrate an SMS gateway and enable it.
              </p>
              <a
                href="/settings/integrations/twilio"
                className="inline-flex h-8 items-center rounded-md border border-amber-300 bg-white px-3 text-[12px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                Integrate
              </a>
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-emerald-700">
              Twilio SMS is connected.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
