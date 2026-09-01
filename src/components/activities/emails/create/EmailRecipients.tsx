import { ArrowLeft, Minus, X } from "lucide-react";
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
  onHideCc: () => void;
  onHideBcc: () => void;
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
  onBack?: () => void;
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
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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

function HideFieldButton({
  label,
  visible,
  onHide,
}: {
  label: string;
  visible: boolean;
  onHide: () => void;
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onHide}
      aria-label={`Remove ${label} field`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-white hover:text-slate-700"
    >
      <Minus className="h-3.5 w-3.5" />
    </button>
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
  onHideCc,
  onHideBcc,
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
  onBack,
}: EmailRecipientsProps) {
  return (
    <div className="divide-y divide-slate-200">
      <div className="flex items-start justify-between gap-3 px-5 py-3">
        {onBack ? (
          <button
            type="button"
            title="Back to mail"
            onClick={onBack}
            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
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
              showCc ? "font-semibold text-violet-700" : "text-muted-foreground",
            )}
          >
            Cc{cc.length ? ` (${cc.length})` : ""}
          </button>
          <button
            type="button"
            onClick={onToggleBcc}
            className={cn(
              "text-sm hover:text-foreground",
              showBcc ? "font-semibold text-violet-700" : "text-muted-foreground",
            )}
          >
            Bcc{bcc.length ? ` (${bcc.length})` : ""}
          </button>
        </div>
      </div>

      {showCc || showBcc ? (
        <div className="divide-y divide-slate-200 bg-slate-50/70">
          {showCc ? (
            <div className="flex items-center gap-2 px-5 py-3">
              <RecipientChips
                label="Cc:"
                values={cc}
                draft={ccDraft}
                onDraftChange={onCcDraftChange}
                onAdd={onAddCc}
                onRemove={onRemoveCc}
                placeholder="Add Cc emails…"
              />
              <HideFieldButton
                label="Cc"
                visible={cc.length === 0 && !ccDraft.trim()}
                onHide={onHideCc}
              />
            </div>
          ) : null}
          {showBcc ? (
            <div className="flex items-center gap-2 px-5 py-3">
              <RecipientChips
                label="Bcc:"
                values={bcc}
                draft={bccDraft}
                onDraftChange={onBccDraftChange}
                onAdd={onAddBcc}
                onRemove={onRemoveBcc}
                placeholder="Add Bcc emails…"
              />
              <HideFieldButton
                label="Bcc"
                visible={bcc.length === 0 && !bccDraft.trim()}
                onHide={onHideBcc}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
