import React from "react";

interface CallNotesEditorProps {
  notes: string;
  onNotesChange: (val: string) => void;
}

export const CallNotesEditor: React.FC<CallNotesEditorProps> = ({
  notes,
  onNotesChange,
}) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Call Notes</h3>
        <div className="inline-flex items-center space-x-1.5 bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full text-xs font-medium border border-sky-100">
          <span>✨</span>
          <span>AI Summary Active</span>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 text-slate-500 text-sm">
        <button
          type="button"
          className="px-2 py-1 hover:bg-slate-100 rounded font-bold"
        >
          B
        </button>
        <button
          type="button"
          className="px-2 py-1 hover:bg-slate-100 rounded italic"
        >
          I
        </button>
        <button type="button" className="px-2 py-1 hover:bg-slate-100 rounded">
          ≡
        </button>
        <span className="text-slate-300">|</span>
        <button type="button" className="px-2 py-1 hover:bg-slate-100 rounded">
          📎
        </button>
        <button type="button" className="px-2 py-1 hover:bg-slate-100 rounded">
          🤖
        </button>
      </div>

      {/* Textarea */}
      <textarea
        rows={6}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Enter notes or let AI summarize automatically..."
        className="w-full text-sm text-slate-700 focus:outline-none resize-none leading-relaxed"
      />
    </div>
  );
};
