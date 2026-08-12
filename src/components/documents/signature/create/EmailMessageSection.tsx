import React from "react";

interface EmailMessageProps {
  title: string;
  setTitle: (val: string) => void;
  message: string;
  setMessage: (val: string) => void;
}

export const EmailMessageSection: React.FC<EmailMessageProps> = ({
  title,
  setTitle,
  message,
  setMessage,
}) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
      <h3 className="text-slate-800 font-semibold text-sm">Email to signers</h3>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Title <span className="text-slate-400 font-normal">✉</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Message <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter a message for the signers..."
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
        />
      </div>
    </div>
  );
};
