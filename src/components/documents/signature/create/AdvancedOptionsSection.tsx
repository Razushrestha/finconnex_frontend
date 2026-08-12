import React from "react";
import { Plus } from "lucide-react";

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

      {/* CCs */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          CCs <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <button
          type="button"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-600" />
          <span>Add CC recipient</span>
        </button>
      </div>

      {/* Expiry */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <label className="flex items-center gap-2 cursor-pointer">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white"
            />
            <input
              type="time"
              value={expiryTime}
              onChange={(e) => setExpiryTime(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};
