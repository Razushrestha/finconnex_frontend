import { CallType } from "@/lib/calls/types";
import React from "react";

interface ConnectionDetailsProps {
  contactName: string;
  onContactChange: (val: string) => void;
  direction: CallType;
  onDirectionChange: (dir: CallType) => void;
  outcome: string;
  onOutcomeChange: (outcome: string) => void;
}

const OUTCOMES = [
  { label: "Connected", icon: "📞" },
  { label: "Left Voicemail", icon: "🔗" },
  { label: "No Answer", icon: "✂️" },
  { label: "Busy", icon: "☎️" },
  { label: "Wrong Number", icon: "❌" },
];

export const ConnectionDetailsCard: React.FC<ConnectionDetailsProps> = ({
  contactName,
  onContactChange,
  direction,
  onDirectionChange,
  outcome,
  onOutcomeChange,
}) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-slate-800">
        Connection Details
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Contact Name *
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={contactName}
              onChange={(e) => onContactChange(e.target.value)}
              placeholder="Search contact..."
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 pl-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-2.5 text-xs text-slate-400">🔍</span>
          </div>
        </div>

        {/* Direction Toggle */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Direction
          </label>
          <div className="inline-flex rounded-lg bg-slate-100 p-1 w-full">
            {(["Outbound", "Inbound"] as CallType[]).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => onDirectionChange(dir)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                  direction === dir
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {dir === "Outbound" ? "↗ Outbound" : "↙ Inbound"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Outcome Selection Grid */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Outcome
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {OUTCOMES.map((item) => {
            const isSelected = outcome === item.label;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onOutcomeChange(item.label)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-md"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="text-base mb-1">{item.icon}</span>
                <span className="text-center leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
