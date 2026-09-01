import React from "react";

interface AdvancedOptionsProps {
  enableReminders: boolean;
  setEnableReminders: (val: boolean) => void;
  reminderDays: string;
  setReminderDays: (val: string) => void;
  enableExpiry: boolean;
  setEnableExpiry: (val: boolean) => void;
  expiryDate: string;
  setExpiryDate: (val: string) => void;
  expiryTime: string;
  setExpiryTime: (val: string) => void;
}

export const AdvancedOptionsSection: React.FC<AdvancedOptionsProps> = ({
  enableReminders,
  setEnableReminders,
  reminderDays,
  setReminderDays,
  enableExpiry,
  setEnableExpiry,
  expiryDate,
  setExpiryDate,
  expiryTime,
  setExpiryTime,
}) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
      <h3 className="text-slate-800 font-semibold text-sm">Advanced Options</h3>

      {/* Reminders */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableReminders}
            onChange={(e) => setEnableReminders(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Send automatic reminders
          </span>
        </label>
        {enableReminders && (
          <div className="flex items-center gap-3 pl-6 text-xs text-slate-600">
            <span>Continue to send reminders to receiver every</span>
            <input
              type="number"
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
              className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-200 text-center font-semibold text-slate-800"
            />
            <span>Days to complete (days)</span>
          </div>
        )}
      </div>

      {/* Expiry */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="flex shrink-0 items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableExpiry}
              onChange={(e) => setEnableExpiry(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Document expiry{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </span>
          </label>

          {enableExpiry && (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800"
              />
              <input
                type="time"
                value={expiryTime}
                onChange={(e) => setExpiryTime(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
