import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailRecipientsProps {
  to: string[];
  recipientDraft: string;
  onDraftChange: (val: string) => void;
  onAddRecipient: () => void;
  onRemoveRecipient: (val: string) => void;
  showCc: boolean;
  showBcc: boolean;
  onToggleCc: () => void;
  onToggleBcc: () => void;
  cc: string[];
  ccDraft: string;
  onCcDraftChange: (val: string) => void;
  onAddCc: () => void;
  onRemoveCc: (val: string) => void;
  bcc: string[];
  bccDraft: string;
  onBccDraftChange: (val: string) => void;
  onAddBcc: () => void;
  onRemoveBcc: (val: string) => void;
  error?: string;
  submitted?: boolean;
}

function RecipientChips({
  label,
  values,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  values: string[];
  draft: string;
  onDraftChange: (val: string) => void;
  onAdd: () => void;
  onRemove: (val: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      {values.map((recipient) => (
        <span
          key={recipient}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-1 pr-1.5 pl-2.5 text-sm font-medium text-secondary-foreground"
        >
          {recipient}
          <button
            type="button"
            onClick={() => onRemove(recipient)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            onAdd();
          }
        }}
        onBlur={onAdd}
        placeholder={placeholder}
        className="min-w-[140px] flex-1 bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </div>
  );
}

export function EmailRecipients({
  to,
  recipientDraft,
  onDraftChange,
  onAddRecipient,
  onRemoveRecipient,
  showCc,
  showBcc,
  onToggleCc,
  onToggleBcc,
  cc,
  ccDraft,
  onCcDraftChange,
  onAddCc,
  onRemoveCc,
  bcc,
  bccDraft,
  onBccDraftChange,
  onAddBcc,
  onRemoveBcc,
  error,
  submitted,
}: EmailRecipientsProps) {
  return (
    <div className="divide-y divide-border">
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex-1">
          <RecipientChips
            label="To:"
            values={to}
            draft={recipientDraft}
            onDraftChange={onDraftChange}
            onAdd={onAddRecipient}
            onRemove={onRemoveRecipient}
            placeholder="Add recipients…"
          />
          {submitted && error ? (
            <p className="mt-1 text-xs text-destructive">{error}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleCc}
            className={cn(
              "text-sm hover:text-foreground",
              showCc
                ? "font-semibold text-violet-700"
                : "text-muted-foreground",
            )}
          >
            Cc{cc.length ? ` (${cc.length})` : ""}
          </button>
          <button
            type="button"
            onClick={onToggleBcc}
            className={cn(
              "text-sm hover:text-foreground",
              showBcc
                ? "font-semibold text-violet-700"
                : "text-muted-foreground",
            )}
          >
            Bcc{bcc.length ? ` (${bcc.length})` : ""}
          </button>
        </div>
      </div>

      {showCc || showBcc ? (
        <div className="space-y-3 bg-muted/20 px-5 py-4">
          {showCc ? (
            <RecipientChips
              label="Cc:"
              values={cc}
              draft={ccDraft}
              onDraftChange={onCcDraftChange}
              onAdd={onAddCc}
              onRemove={onRemoveCc}
              placeholder="Add Cc emails…"
            />
          ) : null}
          {showBcc ? (
            <RecipientChips
              label="Bcc:"
              values={bcc}
              draft={bccDraft}
              onDraftChange={onBccDraftChange}
              onAdd={onAddBcc}
              onRemove={onRemoveBcc}
              placeholder="Add Bcc emails…"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
