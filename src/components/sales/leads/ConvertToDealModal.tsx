"use client";

import { useEffect, useState } from "react";
import { Link2, X, ArrowRight, Calendar } from "lucide-react";

export interface ConvertToDealPrimaryContact {
  name: string;
  company: string;
  avatarUrl?: string;
  initials?: string;
}

export interface ConvertToDealFormValues {
  dealName: string;
  amount: string;
  expectedCloseDate: string;
  dealStage: string;
}

export interface ConvertToDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryContact: ConvertToDealPrimaryContact;
  dealStages: string[];
  /** Pre-filled deal name, e.g. `${company} - Enterprise Migration`. */
  defaultDealName?: string;
  onConvert: (values: ConvertToDealFormValues) => void;
}

/**
 * Generic enough to reuse from a Contact detail page too — anywhere that
 * needs to spin up a Deal from an existing record. Pass a different
 * `primaryContact` / `dealStages` per caller.
 */
export function ConvertToDealModal({
  isOpen,
  onClose,
  primaryContact,
  dealStages,
  defaultDealName = "",
  onConvert,
}: ConvertToDealModalProps) {
  const [dealName, setDealName] = useState(defaultDealName);
  const [amount, setAmount] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [dealStage, setDealStage] = useState(dealStages[0] ?? "");

  useEffect(() => {
    if (isOpen) {
      setDealName(defaultDealName);
      setAmount("");
      setExpectedCloseDate("");
      setDealStage(dealStages[0] ?? "");
    }
  }, [isOpen, defaultDealName, dealStages]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isValid =
    dealName.trim() && amount.trim() && expectedCloseDate && dealStage;

  function handleSubmit() {
    if (!isValid) return;
    onConvert({ dealName, amount, expectedCloseDate, dealStage });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-to-deal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-card border border-border p-5 shadow-2xl text-card-foreground"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Link2 className="h-4 w-4" />
            </span>
            <h2
              id="convert-to-deal-title"
              className="text-sm font-semibold text-foreground"
            >
              Convert to Deal
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted/50 border border-border/50 p-3">
          {primaryContact.avatarUrl ? (
            <img
              src={primaryContact.avatarUrl}
              alt={primaryContact.name}
              className="h-9 w-9 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground">
              {primaryContact.initials ??
                primaryContact.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Primary Contact
            </p>
            <p className="text-sm text-foreground font-medium">
              {primaryContact.name}{" "}
              <span className="text-muted-foreground font-normal">
                ({primaryContact.company})
              </span>
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Deal Name <span className="text-destructive">*</span>
            </label>
            <input
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Amount <span className="text-destructive">*</span>
              </label>
              <div className="mt-1 flex items-center rounded-lg border border-input bg-background px-3 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-full border-none bg-transparent py-2 pl-1.5 text-sm text-foreground focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Expected Close Date <span className="text-destructive">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Calendar className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Deal Stage <span className="text-destructive">*</span>
            </label>
            <select
              value={dealStage}
              onChange={(e) => setDealStage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {dealStages.map((stage) => (
                <option
                  key={stage}
                  value={stage}
                  className="bg-popover text-popover-foreground"
                >
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            Convert Lead
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
