"use client";

import { useState, type ReactNode } from "react";
import { Info, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const BRAND = "#5A32A3";

export type AdditionalSettingsValues = {
  assignOnBook: boolean;
  skipIfAssigned: boolean;
  allowReschedule: boolean;
  rescheduleExpire: number;
  rescheduleUnit: "Minutes" | "Hours" | "Days";
  allowCancel: boolean;
  cancelExpire: number;
  cancelUnit: "Minutes" | "Hours" | "Days";
  thirdPartyInvites: boolean;
  inviteNotes: string;
};

export const DEFAULT_ADDITIONAL_SETTINGS: AdditionalSettingsValues = {
  assignOnBook: true,
  skipIfAssigned: false,
  allowReschedule: true,
  rescheduleExpire: 0,
  rescheduleUnit: "Minutes",
  allowCancel: true,
  cancelExpire: 0,
  cancelUnit: "Minutes",
  thirdPartyInvites: true,
  inviteNotes:
    "Phone:- {{contact.phone}}\nEmail:- {{contact.email}}\n\nNeed to make a change to this event?\nReschedule:-",
};

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-[#5A32A3]" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          on && "translate-x-5",
        )}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  on,
  onChange,
  info,
  children,
}: {
  title: string;
  description?: string;
  on: boolean;
  onChange: (v: boolean) => void;
  info?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-[#F3F4F6] py-4 last:border-0">
      <div className="flex items-start gap-3">
        <Toggle on={on} onChange={onChange} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
            {title}
            {info ? (
              <span className="group relative inline-flex">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden w-56 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] text-white group-hover:block">
                  {info}
                </span>
              </span>
            ) : null}
          </p>
          {description ? (
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              {description}
            </p>
          ) : null}
          {on ? children : null}
        </div>
      </div>
    </div>
  );
}

export function BookingAdditionalSettingsStep({
  initial,
  onBack,
  onFinish,
}: {
  initial?: AdditionalSettingsValues;
  onBack: () => void;
  onFinish: (values: AdditionalSettingsValues) => void;
}) {
  const [values, setValues] = useState<AdditionalSettingsValues>(
    initial ?? DEFAULT_ADDITIONAL_SETTINGS,
  );

  function patch(partial: Partial<AdditionalSettingsValues>) {
    setValues((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-4 pb-8">
      <section className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-7">
        <h1 className="text-[18px] font-bold text-slate-900">
          Additional settings
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Configure additional settings for your calendar.
        </p>

        <div className="mt-4">
          <SettingRow
            title="Assign contacts to their respective calendar team members each time an appointment is booked."
            description="When enabled, Contact's assigned user will match the owner of the appointment with the most recent change — whether it's been booked, rescheduled, or reassigned."
            on={values.assignOnBook}
            onChange={(assignOnBook) => patch({ assignOnBook })}
          />
          <SettingRow
            title="Skip assigning Contact if the Contact has already an assigned user."
            description="When enabled, a Contact's assigned user will remain the same, even if the appointment owner is different."
            on={values.skipIfAssigned}
            onChange={(skipIfAssigned) => patch({ skipIfAssigned })}
          />
        </div>

        <h2 className="mt-5 text-[14px] font-bold text-slate-800">
          Cancellation and reschedule policy
        </h2>
        <SettingRow
          title="Allow rescheduling of meeting"
          info="Guests can use a manage link to pick a new time."
          on={values.allowReschedule}
          onChange={(allowReschedule) => patch({ allowReschedule })}
        >
          <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
            Rescheduling link will expire
            <input
              type="number"
              min={0}
              value={values.rescheduleExpire || ""}
              onChange={(e) =>
                patch({ rescheduleExpire: Number(e.target.value) || 0 })
              }
              className="h-9 w-20 rounded-lg border border-[#E5E7EB] px-2 text-[13px] outline-none focus:border-[#5A32A3]/40"
            />
            <select
              value={values.rescheduleUnit}
              onChange={(e) =>
                patch({
                  rescheduleUnit: e.target.value as AdditionalSettingsValues["rescheduleUnit"],
                })
              }
              className="h-9 rounded-lg border border-[#E5E7EB] px-2 text-[12px]"
            >
              <option>Minutes</option>
              <option>Hours</option>
              <option>Days</option>
            </select>
            before the meeting.
          </p>
        </SettingRow>
        <SettingRow
          title="Allow cancellation of meeting"
          info="Guests can cancel from the manage link."
          on={values.allowCancel}
          onChange={(allowCancel) => patch({ allowCancel })}
        >
          <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
            Cancellation link will expire
            <input
              type="number"
              min={0}
              value={values.cancelExpire || ""}
              onChange={(e) =>
                patch({ cancelExpire: Number(e.target.value) || 0 })
              }
              className="h-9 w-20 rounded-lg border border-[#E5E7EB] px-2 text-[13px] outline-none focus:border-[#5A32A3]/40"
            />
            <select
              value={values.cancelUnit}
              onChange={(e) =>
                patch({
                  cancelUnit: e.target.value as AdditionalSettingsValues["cancelUnit"],
                })
              }
              className="h-9 rounded-lg border border-[#E5E7EB] px-2 text-[12px]"
            >
              <option>Minutes</option>
              <option>Hours</option>
              <option>Days</option>
            </select>
            before the meeting.
          </p>
        </SettingRow>
      </section>

      <section className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-7">
        <h2 className="text-[18px] font-bold text-slate-900">
          Third-party calendar settings
        </h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Set up your preferences for third-party calendars.
        </p>
        <div className="mt-4">
          <SettingRow
            title="Allow Google / Outlook / iCloud calendar to send invitation & update emails to attendees."
            on={values.thirdPartyInvites}
            onChange={(thirdPartyInvites) => patch({ thirdPartyInvites })}
          />
        </div>
        <div className="mt-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
            Meeting invite notes
            <Info className="h-3.5 w-3.5 text-slate-400" />
          </p>
          <div className="relative">
            <textarea
              value={values.inviteNotes}
              onChange={(e) => patch({ inviteNotes: e.target.value })}
              rows={7}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 pr-8 text-[13px] leading-relaxed outline-none focus:border-[#5A32A3]/40"
            />
            <Tag className="absolute right-3 bottom-3 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </section>

      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-10 min-w-[96px] rounded-lg border border-[#E5E7EB] bg-white px-6 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onFinish(values)}
          className="h-10 rounded-lg px-5 text-[13px] font-semibold text-white hover:brightness-110"
          style={{ backgroundColor: BRAND }}
        >
          Finish setup
        </button>
      </div>
    </div>
  );
}
