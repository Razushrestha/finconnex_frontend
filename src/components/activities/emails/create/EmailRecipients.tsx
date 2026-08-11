import { X } from "lucide-react";

interface EmailRecipientsProps {
  to: string[];
  recipientDraft: string;
  onDraftChange: (val: string) => void;
  onAddRecipient: () => void;
  onRemoveRecipient: (val: string) => void;
  showCcBcc: boolean;
  onToggleCcBcc: () => void;
  cc: string;
  bcc: string;
  onCcChange: (val: string) => void;
  onBccChange: (val: string) => void;
  error?: string;
  submitted?: boolean;
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export function EmailRecipients({
  to,
  recipientDraft,
  onDraftChange,
  onAddRecipient,
  onRemoveRecipient,
  showCcBcc,
  onToggleCcBcc,
  cc,
  bcc,
  onCcChange,
  onBccChange,
  error,
  submitted,
}: EmailRecipientsProps) {
  return (
    <div className="divide-y divide-border">
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-1">To:</span>
            {to.map((recipient) => (
              <span
                key={recipient}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-1 pl-2.5 pr-1.5 text-sm font-medium text-secondary-foreground"
              >
                {recipient}
                <button
                  type="button"
                  onClick={() => onRemoveRecipient(recipient)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={recipientDraft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  onAddRecipient();
                }
              }}
              onBlur={onAddRecipient}
              placeholder="Add recipients…"
              className="min-w-[140px] flex-1 bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          {submitted && error && (
            <p className="mt-1 text-xs text-destructive">{error}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleCcBcc}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
        >
          Cc/Bcc
        </button>
      </div>

      {showCcBcc && (
        <div className="grid grid-cols-2 gap-3 px-5 py-4 bg-muted/20">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Cc
            </label>
            <input
              className={inputClass + " mt-1"}
              value={cc}
              onChange={(e) => onCcChange(e.target.value)}
              placeholder="cc@company.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Bcc
            </label>
            <input
              className={inputClass + " mt-1"}
              value={bcc}
              onChange={(e) => onBccChange(e.target.value)}
              placeholder="bcc@company.com"
            />
          </div>
        </div>
      )}
    </div>
  );
}
