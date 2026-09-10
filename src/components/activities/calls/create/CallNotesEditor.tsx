import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";

interface CallNotesEditorProps {
  notes: string;
  onNotesChange: (val: string) => void;
}

export const CallNotesEditor: React.FC<CallNotesEditorProps> = ({
  notes,
  onNotesChange,
}) => {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Call Notes</h3>
        <div className="inline-flex items-center space-x-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
          <span>✨</span>
          <span>AI Summary Active</span>
        </div>
      </div>

      <MentionNotesTextarea
        value={notes}
        onChange={onNotesChange}
        placeholder="Enter notes or let AI summarize automatically... Type @ to assign someone."
      />
    </div>
  );
};
