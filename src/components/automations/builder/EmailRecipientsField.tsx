"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  searchEmailAddresses,
  type AddressSuggestion,
} from "@/lib/automations/address-search";
import {
  isEmailAddress,
  MAX_EMAIL_RECIPIENTS,
  readEmailRecipients,
  recipientCount,
  supportsTriggerEmail,
  writeEmailRecipients,
  type EmailRecipients,
} from "@/lib/automations/email-recipients";
import { entityNoun } from "@/lib/automations/trigger-scope";
import type { AutomationEntityType } from "@/lib/automations/types";
import { cn } from "@/lib/utils";

/**
 * Teammates and contacts whose name or address matches what is being typed.
 * Debounced so a fast typist doesn't queue one request per keystroke.
 */
function useAddressOptions(query: string, enabled: boolean) {
  const [options, setOptions] = useState<AddressSuggestion[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setState("loading");
      searchEmailAddresses(query)
        .then((rows) => {
          if (cancelled) return;
          setOptions(rows);
          setState("ready");
        })
        .catch(() => {
          if (!cancelled) setState("error");
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, enabled]);

  return { options, state };
}

/** One suggestion row — the name, its address, and where it came from. */
function AddressRow({
  option,
  disabled,
  onPick,
}: {
  option: AddressSuggestion;
  disabled?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md p-1.5 text-left text-sm",
        disabled ? "opacity-50" : "hover:bg-slate-50",
      )}
    >
      <span className="flex-1 truncate">
        <span className="block truncate text-slate-700">{option.name}</span>
        <span className="block truncate text-xs text-slate-400">{option.email}</span>
      </span>
      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {option.source}
      </span>
    </button>
  );
}

/**
 * One address line — Cc or Bcc. Each chosen address carries its own "−", and
 * "+" opens the contact list; an address that belongs to nobody in the CRM
 * can still be typed in.
 */
function RecipientLine({
  label,
  addresses,
  disabledAdd,
  onChange,
}: {
  label: string;
  addresses: string[];
  /** True once the step has as many recipients as one email may carry. */
  disabledAdd: boolean;
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { options, state } = useAddressOptions(query, open);

  const chosen = useMemo(
    () => new Set(addresses.map((address) => address.toLowerCase())),
    [addresses],
  );
  const typed = query.trim();
  const canAddTyped = isEmailAddress(typed) && !chosen.has(typed.toLowerCase());

  function add(address: string) {
    if (chosen.has(address.toLowerCase())) return;
    onChange([...addresses, address]);
    setQuery("");
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          disabled={disabledAdd && !open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {open ? "Done" : "Add"}
        </Button>
      </div>

      {addresses.length > 0 && (
        <div className="space-y-1">
          {addresses.map((address) => (
            <div
              key={address}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm",
                isEmailAddress(address)
                  ? "border-slate-200 text-slate-700"
                  : "border-rose-200 bg-rose-50 text-rose-700",
              )}
            >
              <span className="flex-1 truncate">{address}</span>
              <button
                type="button"
                aria-label={`Remove ${address}`}
                onClick={() => onChange(addresses.filter((item) => item !== address))}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !canAddTyped) return;
                e.preventDefault();
                add(typed);
              }}
              placeholder="Search teammates and contacts, or type an address"
              className="pl-8"
            />
          </div>

          {canAddTyped && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full justify-start gap-1 text-xs"
              onClick={() => add(typed)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add {typed}
            </Button>
          )}

          {state === "loading" && (
            <div className="flex items-center gap-2 p-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading contacts...
            </div>
          )}

          {state === "error" && (
            <p className="rounded-md border border-dashed border-rose-200 p-2 text-xs text-rose-600">
              Couldn&apos;t load contacts. You can still type an address above.
            </p>
          )}

          {state === "ready" && options.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-200 p-2 text-xs text-slate-400">
              No teammates or contacts with an email address match this search.
            </p>
          )}

          {state === "ready" && options.length > 0 && (
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {options.map((option) => (
                <AddressRow
                  key={`${option.source}:${option.email}`}
                  option={option}
                  disabled={chosen.has(option.email.toLowerCase())}
                  onPick={() => add(option.email)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Matching addresses under the To box, so the address can be recognised
 * rather than recalled.
 *
 * Nothing is shown until something is typed — an empty box is asking for any
 * address, not for the first eight in the workspace — and the list closes
 * once the box holds exactly the address that was picked.
 */
function ToSuggestions({
  value,
  onPick,
}: {
  value: string;
  onPick: (email: string) => void;
}) {
  const query = value.trim();
  const { options, state } = useAddressOptions(query, query.length > 0);
  const exact = options.some(
    (option) => option.email.toLowerCase() === query.toLowerCase(),
  );

  if (!query || (exact && options.length === 1)) return null;

  return (
    <div className="mt-1.5 rounded-lg border border-slate-200 p-1">
      {state === "loading" && (
        <div className="flex items-center gap-2 p-1.5 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Searching teammates and contacts...
        </div>
      )}

      {state === "error" && (
        <p className="p-1.5 text-xs text-slate-400">
          Couldn&apos;t search teammates and contacts — the address you typed still works.
        </p>
      )}

      {state === "ready" && options.length === 0 && (
        <p className="p-1.5 text-xs text-slate-400">
          No teammate or contact matches &quot;{query}&quot;.
        </p>
      )}

      {state === "ready" && options.length > 0 && (
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {options.map((option) => (
            <AddressRow
              key={`${option.source}:${option.email}`}
              option={option}
              disabled={option.email.toLowerCase() === query.toLowerCase()}
              onPick={() => onPick(option.email)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ToOption({
  active,
  title,
  subtitle,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5",
        active ? "border-blue-300 bg-blue-50/40" : "border-slate-200",
      )}
    >
      <button type="button" onClick={onClick} className="flex w-full items-start gap-2.5 text-left">
        <span
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            active ? "border-blue-600" : "border-slate-300",
          )}
          aria-hidden
        >
          {active && <span className="h-2 w-2 rounded-full bg-blue-600" />}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium text-slate-700">{title}</span>
          {subtitle && <span className="mt-0.5 block text-xs text-slate-500">{subtitle}</span>}
        </span>
      </button>
      {active && children && <div className="mt-2 pl-6.5">{children}</div>}
    </div>
  );
}

/**
 * To / Cc / Bcc for a SEND_EMAIL step, in place of the three generic text
 * boxes the action form would otherwise render for those keys.
 *
 * "To" defaults to the record the workflow is about, which is what the step
 * means nine times out of ten and the one address the builder cannot know in
 * advance; the executor resolves it at run time.
 */
export function EmailRecipientsField({
  entityType,
  config,
  onChange,
}: {
  entityType: AutomationEntityType;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const recipients = readEmailRecipients(config);
  const noun = entityNoun(entityType).one;
  const canUseTrigger = supportsTriggerEmail(entityType);
  // Problems are reported once, by the panel that owns the Save button.
  const total = recipientCount(recipients);
  const full = total >= MAX_EMAIL_RECIPIENTS;

  function set(next: Partial<EmailRecipients>) {
    onChange(writeEmailRecipients(config, { ...recipients, ...next }));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-600">
          To<span className="text-rose-500"> *</span>
        </label>

        <ToOption
          active={recipients.toEmail === undefined}
          title={`The ${noun}'s email address`}
          subtitle={
            canUseTrigger
              ? `Whichever ${noun} the workflow ran for, resolved when the email is sent.`
              : `A ${noun} has no email address of its own — pick a specific address below.`
          }
          onClick={() => set({ toEmail: undefined })}
        />

        <ToOption
          active={recipients.toEmail !== undefined}
          title="A specific address"
          onClick={() => set({ toEmail: recipients.toEmail ?? "" })}
        >
          <Input
            value={recipients.toEmail ?? ""}
            onChange={(e) => set({ toEmail: e.target.value })}
            placeholder="name@example.com"
            autoFocus
          />
          <ToSuggestions
            value={recipients.toEmail ?? ""}
            onPick={(email) => set({ toEmail: email })}
          />
        </ToOption>
      </div>

      <RecipientLine
        label="Cc"
        addresses={recipients.cc}
        disabledAdd={full}
        onChange={(cc) => set({ cc })}
      />
      <RecipientLine
        label="Bcc"
        addresses={recipients.bcc}
        disabledAdd={full}
        onChange={(bcc) => set({ bcc })}
      />

      {(recipients.cc.length > 0 || recipients.bcc.length > 0) && (
        <p className="text-[11px] text-slate-400">
          {total} of {MAX_EMAIL_RECIPIENTS} recipients. Bcc stays hidden from everyone else on
          the email.
        </p>
      )}
    </div>
  );
}
