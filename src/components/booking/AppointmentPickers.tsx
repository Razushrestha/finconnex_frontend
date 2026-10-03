"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Plus,
  Search,
  Ticket,
  User,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  CUSTOMER_SOURCES,
  amountToBePaid,
  currencyPrefix,
  eventTypeInitials,
  eventTypeTileColor,
  filterCustomers,
  formatAppointmentAmount,
  hasPrice,
  matchesKeywords,
  monthGrid,
  monthLabel,
  parsePaidAmount,
  type AppointmentCustomer,
  type AppointmentSlot,
  type CustomerSource,
  type PaymentStatus,
} from "@/lib/booking/new-appointment";
import type { BookingCurrency } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

/** Accent used across the New Appointment form. */
export const ACCENT = "#5A4FCF";

const POPOVER =
  "absolute left-0 right-0 z-30 rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]";
const SEARCH_INPUT =
  "h-11 w-full rounded-xl border border-slate-200 bg-white text-[14px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#5A4FCF]";

type Icon = ComponentType<{ className?: string }>;

/* -------------------------------------------------------------------------- */
/* Field shell                                                                */
/* -------------------------------------------------------------------------- */

export function PickerField({
  label,
  picker,
  children,
}: {
  label: string;
  /** Lets the dialog tell which picker a click landed in. */
  picker?: string;
  children: ReactNode;
}) {
  return (
    <div data-picker={picker} className="relative">
      <p className="mb-1.5 text-[13px] text-slate-500">{label}</p>
      {children}
    </div>
  );
}

export function PickerTrigger({
  icon: IconComponent,
  value,
  placeholder,
  chevron = false,
  open = false,
  invalid = false,
  onClick,
  label,
}: {
  icon: Icon;
  value: string;
  placeholder: string;
  chevron?: boolean;
  open?: boolean;
  invalid?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        "flex h-[58px] w-full items-center gap-3 rounded-xl border bg-white px-3 text-left transition-colors outline-none",
        "focus-visible:border-[#5A4FCF] focus-visible:ring-2 focus-visible:ring-[#5A4FCF]/15",
        invalid
          ? "border-rose-300"
          : open
            ? "border-[#5A4FCF]"
            : "border-slate-200 hover:border-slate-300",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
        <IconComponent className="h-[18px] w-[18px]" />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[15px]",
          value ? "text-slate-800" : "text-slate-500",
        )}
      >
        {value || placeholder}
      </span>
      {chevron ? (
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        />
      ) : null}
    </button>
  );
}

function useAutoFocus<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);
  return ref;
}

/* -------------------------------------------------------------------------- */
/* Event Types                                                                */
/* -------------------------------------------------------------------------- */

export type EventTypeOption = {
  id: string;
  name: string;
  price?: number;
  currency?: BookingCurrency;
};

export function EventTypePicker({
  options,
  loading,
  selectedId,
  open,
  invalid,
  onOpenChange,
  onSelect,
}: {
  options: EventTypeOption[];
  loading: boolean;
  selectedId: string;
  open: boolean;
  invalid: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useAutoFocus<HTMLInputElement>(open);
  const selected = options.find((option) => option.id === selectedId);
  const shown = options.filter((option) => matchesKeywords(option.name, query));

  return (
    <PickerField label="Event Types" picker="event">
      <PickerTrigger
        label="Event Types"
        icon={Ticket}
        value={selected?.name ?? ""}
        placeholder="Select Event Type"
        chevron
        open={open}
        invalid={invalid}
        onClick={() => {
          setQuery("");
          onOpenChange(!open);
        }}
      />
      {open ? (
        <div className={cn(POPOVER, "top-full mt-2 p-3")}>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search keywords"
              aria-label="Search event types"
              className={cn(SEARCH_INPUT, "pr-3 pl-10")}
            />
          </div>
          <ul role="listbox" aria-label="Event types" className="mt-2 max-h-64 overflow-y-auto">
            {loading && options.length === 0 ? (
              <li className="px-2 py-5 text-center text-[13px] text-slate-400">
                Loading event types…
              </li>
            ) : shown.length === 0 ? (
              <li className="px-2 py-5 text-center text-[13px] text-slate-400">
                {options.length === 0
                  ? "No active event types yet. Create and activate a consultation first."
                  : "No event types match your search."}
              </li>
            ) : (
              shown.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.id === selectedId}
                    onClick={() => {
                      onSelect(option.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50",
                      option.id === selectedId && "bg-slate-50",
                    )}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold text-white"
                      style={{ backgroundColor: eventTypeTileColor(option.id) }}
                    >
                      {eventTypeInitials(option.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-slate-800">
                      {option.name}
                    </span>
                    {hasPrice(option.price) ? (
                      <span className="shrink-0 text-[14px] font-medium text-[#3D3A8F]">
                        {formatAppointmentAmount(option.price, option.currency)}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[13px] text-slate-400">Free</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </PickerField>
  );
}

/* -------------------------------------------------------------------------- */
/* User                                                                       */
/* -------------------------------------------------------------------------- */

export type UserOption = { id: string; name: string };

export function UserPicker({
  users,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  users: UserOption[];
  value: "random" | string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: "random" | string) => void;
}) {
  const choice = users.length > 1;
  const selected = users.find((user) => user.id === value);
  return (
    <PickerField label="User" picker="user">
      <PickerTrigger
        label="User"
        icon={UsersRound}
        value={selected?.name ?? "Random User"}
        placeholder="Random User"
        chevron={choice}
        open={open}
        onClick={() => {
          if (choice) onOpenChange(!open);
        }}
      />
      {open && choice ? (
        <div className={cn(POPOVER, "top-full mt-2 p-2")}>
          <ul role="listbox" aria-label="Users" className="max-h-64 overflow-y-auto">
            {[{ id: "random", name: "Random User" }, ...users].map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={user.id === value}
                  onClick={() => {
                    onChange(user.id);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-[15px] text-slate-800 hover:bg-slate-50",
                    user.id === value && "bg-slate-50 font-medium",
                  )}
                >
                  {user.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PickerField>
  );
}

/* -------------------------------------------------------------------------- */
/* Date & Time                                                                */
/* -------------------------------------------------------------------------- */

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export function DateTimePicker({
  open,
  invalid,
  display,
  year,
  month0,
  todayKey,
  selectedDate,
  days,
  loading,
  error,
  hasEventType,
  selectedSlot,
  onOpenChange,
  onMonthChange,
  onSelectDate,
  onSelectSlot,
}: {
  open: boolean;
  invalid: boolean;
  /** The chosen date and time, written out; empty until one is picked. */
  display: string;
  year: number;
  month0: number;
  /** Today's date in the event type's timezone — earlier days can't be booked. */
  todayKey: string;
  selectedDate: string;
  /** Slots for the month on screen, keyed by YYYY-MM-DD. */
  days: Map<string, AppointmentSlot[]>;
  loading: boolean;
  error: string;
  hasEventType: boolean;
  selectedSlot: string;
  onOpenChange: (open: boolean) => void;
  onMonthChange: (delta: number) => void;
  onSelectDate: (iso: string) => void;
  onSelectSlot: (slot: AppointmentSlot) => void;
}) {
  const cells = monthGrid(year, month0);
  const nowMs = Date.now();
  const futureOn = (iso: string) =>
    (days.get(iso) ?? []).filter((slot) => Date.parse(slot.startTime) > nowMs);
  const slots = futureOn(selectedDate);
  const atCurrentMonth = `${year}-${String(month0 + 1).padStart(2, "0")}` <= todayKey.slice(0, 7);

  const anchorRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{
    top: number;
    left: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPlace(null);
      return;
    }
    function align() {
      const box = anchorRef.current?.getBoundingClientRect();
      if (!box) return;
      const width = Math.min(560, window.innerWidth - 16);
      const height = Math.min(420, window.innerHeight - 16);
      const left = Math.max(8, Math.min(box.right - width, window.innerWidth - width - 8));
      const below = box.bottom + 8;
      const top =
        below + height > window.innerHeight - 8
          ? Math.max(8, window.innerHeight - height - 8)
          : below;
      setPlace({ top, left, height });
    }
    align();
    window.addEventListener("resize", align);
    window.addEventListener("scroll", align, true);
    return () => {
      window.removeEventListener("resize", align);
      window.removeEventListener("scroll", align, true);
    };
  }, [open]);

  let side: ReactNode;
  if (!hasEventType) {
    side = <SideMessage>Select an Event Type first</SideMessage>;
  } else if (loading) {
    side = (
      <SideMessage>
        <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-slate-400" aria-label="Loading slots" />
      </SideMessage>
    );
  } else if (error) {
    side = <SideMessage tone="error">{error}</SideMessage>;
  } else if (slots.length === 0) {
    side = <SideMessage>No Slots Available</SideMessage>;
  } else {
    side = (
      <ul
        role="listbox"
        aria-label="Available times"
        className="flex flex-col gap-3"
      >
        {slots.map((slot) => (
          <li key={slot.startTime}>
            <button
              type="button"
              role="option"
              aria-selected={slot.startTime === selectedSlot}
              onClick={() => onSelectSlot(slot)}
              className={cn(
                "h-11 w-full rounded-full border text-[14px] font-medium transition-colors",
                slot.startTime === selectedSlot
                  ? "border-[#5A4FCF] bg-[#5A4FCF] text-white"
                  : "border-[#5A4FCF] bg-white text-slate-700 hover:bg-[#F4F2FF]",
              )}
            >
              {slotClockLabel(slot.label)}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <PickerField label="Date & Time" picker="date">
      <div ref={anchorRef}>
        <PickerTrigger
          label="Date and time"
          icon={CalendarDays}
          value={display}
          placeholder="Select Date & Time"
          chevron
          open={open}
          invalid={invalid}
          onClick={() => onOpenChange(!open)}
        />
      </div>
      {open && place && typeof document !== "undefined"
        ? createPortal(
            <div
              data-picker="date"
              style={{ top: place.top, left: place.left, height: place.height }}
              className="fixed z-[80] flex w-[min(560px,calc(100vw-16px))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
            >
              <div className="w-[250px] shrink-0 overflow-y-auto pr-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Previous month"
                    disabled={atCurrentMonth}
                    onClick={() => onMonthChange(-1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[14px] font-semibold text-slate-800">
                    {monthLabel(year, month0)}
                  </span>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => onMonthChange(1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-7 text-center text-[12px] font-medium text-slate-400">
                  {WEEKDAY_LETTERS.map((letter, index) => (
                    <span key={index}>{letter}</span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-y-1">
                  {cells.map((cell, index) => {
                    if (!cell) return <span key={`pad-${index}`} />;
                    const past = cell.iso < todayKey;
                    const selected = cell.iso === selectedDate;
                    const today = cell.iso === todayKey;
                    const hasSlots = futureOn(cell.iso).length > 0;
                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        disabled={past}
                        aria-label={cell.iso}
                        aria-pressed={selected}
                        onClick={() => onSelectDate(cell.iso)}
                        className={cn(
                          "relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[13px] transition-colors",
                          selected
                            ? "bg-[#5A4FCF] font-semibold text-white after:absolute after:bottom-[3px] after:left-1/2 after:h-0 after:w-0 after:-translate-x-1/2 after:border-x-[3.5px] after:border-b-[4px] after:border-x-transparent after:border-b-white after:content-['']"
                            : today
                              ? "border border-slate-200 text-slate-800 after:absolute after:bottom-[2px] after:left-1/2 after:h-0 after:w-0 after:-translate-x-1/2 after:border-x-[3.5px] after:border-b-[4px] after:border-x-transparent after:border-b-slate-400 after:content-['']"
                              : past
                                ? "cursor-not-allowed text-slate-300"
                                : "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {cell.day}
                        {hasSlots && !selected && !today ? (
                          <span className="absolute bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#5A4FCF]/60" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-slate-100 pl-5">
                <p className="mb-3 shrink-0 text-[15px] font-semibold text-slate-800">
                  Available Slots
                </p>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                  {side}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </PickerField>
  );
}

/** "9:00 AM" → "09:00 AM", same clock as Dates and times. */
function slotClockLabel(label: string) {
  const match = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return label;
  return `${match[1].padStart(2, "0")}:${match[2]} ${match[3].toUpperCase()}`;
}

function SideMessage({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "error";
}) {
  return (
    <p
      className={cn(
        "flex flex-1 items-center justify-center px-2 text-center text-[15px] font-bold",
        tone === "error" ? "text-rose-600" : "text-[#2B3A55]",
      )}
    >
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Customer                                                                   */
/* -------------------------------------------------------------------------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewCustomerInput = { name: string; email: string; phone: string };

export function CustomerPicker({
  open,
  invalid,
  selected,
  source,
  customers,
  loading,
  onOpenChange,
  onSourceChange,
  onSelect,
  onCreate,
}: {
  open: boolean;
  invalid: boolean;
  selected: AppointmentCustomer | null;
  source: CustomerSource;
  customers: AppointmentCustomer[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSourceChange: (source: CustomerSource) => void;
  onSelect: (customer: AppointmentCustomer) => void;
  onCreate: (input: NewCustomerInput) => Promise<AppointmentCustomer>;
}) {
  return (
    <PickerField label="Customer" picker="customer">
      <PickerTrigger
        label="Customer"
        icon={UserRound}
        value={selected?.name ?? ""}
        placeholder="Select Customer"
        chevron
        open={open}
        invalid={invalid}
        onClick={() => onOpenChange(!open)}
      />
      {open ? (
        <CustomerPopover
          selected={selected}
          source={source}
          customers={customers}
          loading={loading}
          onOpenChange={onOpenChange}
          onSourceChange={onSourceChange}
          onSelect={onSelect}
          onCreate={onCreate}
        />
      ) : null}
    </PickerField>
  );
}

/** Mounted only while open, so the search box and the form start empty each time. */
function CustomerPopover({
  selected,
  source,
  customers,
  loading,
  onOpenChange,
  onSourceChange,
  onSelect,
  onCreate,
}: {
  selected: AppointmentCustomer | null;
  source: CustomerSource;
  customers: AppointmentCustomer[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSourceChange: (source: CustomerSource) => void;
  onSelect: (customer: AppointmentCustomer) => void;
  onCreate: (input: NewCustomerInput) => Promise<AppointmentCustomer>;
}) {
  const [query, setQuery] = useState("");
  const [sourceMenu, setSourceMenu] = useState(false);
  const [creating, setCreating] = useState(false);
  const searchRef = useAutoFocus<HTMLInputElement>(!creating);
  const shown = filterCustomers(customers, query);

  return (
        <div className={cn(POPOVER, "bottom-full mb-2 p-3")}>
          {creating ? (
            <NewCustomerForm
              initialName={query}
              onCancel={() => setCreating(false)}
              onCreate={async (input) => {
                const created = await onCreate(input);
                onSelect(created);
                onOpenChange(false);
              }}
            />
          ) : (
            <>
              <div className="flex">
                <div className="relative">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={sourceMenu}
                    aria-label="Customer source"
                    onClick={() => setSourceMenu((current) => !current)}
                    className="flex h-11 items-center gap-1.5 rounded-l-xl border border-slate-200 bg-slate-50 px-3 text-[14px] font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {source}
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                  {sourceMenu ? (
                    <ul
                      role="listbox"
                      aria-label="Customer source"
                      className="absolute top-full left-0 z-10 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                    >
                      {CUSTOMER_SOURCES.map((item) => (
                        <li key={item}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={item === source}
                            onClick={() => {
                              onSourceChange(item);
                              setSourceMenu(false);
                            }}
                            className={cn(
                              "block w-full px-3 py-1.5 text-left text-[14px] text-slate-700 hover:bg-slate-50",
                              item === source && "font-semibold text-[#5A4FCF]",
                            )}
                          >
                            {item}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Enter to Search"
                  aria-label="Search customers"
                  className={cn(SEARCH_INPUT, "min-w-0 flex-1 rounded-l-none px-3")}
                />
              </div>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="mt-3 inline-flex items-center gap-1 text-[14px] font-medium text-[#2563EB] hover:underline"
              >
                <Plus className="h-4 w-4" />
                New Customer
              </button>
              <div className="my-2.5 border-t border-slate-100" />
              <ul role="listbox" aria-label="Customers" className="max-h-56 overflow-y-auto">
                {loading && customers.length === 0 ? (
                  <li className="px-2 py-4 text-center text-[13px] text-slate-400">
                    Loading customers…
                  </li>
                ) : shown.length === 0 ? (
                  <li className="px-2 py-4 text-center text-[13px] text-slate-400">
                    {customers.length === 0
                      ? `No ${source.toLowerCase()} found.`
                      : "No customers match your search."}
                  </li>
                ) : (
                  shown.map((customer) => (
                    <li key={customer.key}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={customer.key === selected?.key}
                        onClick={() => {
                          onSelect(customer);
                          onOpenChange(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50",
                          customer.key === selected?.key && "bg-slate-50",
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-white">
                          <User className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] text-slate-800">
                            {customer.name}
                          </span>
                          <span className="block truncate text-[12px] text-slate-400">
                            {customer.email || "No email address"}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
  );
}

function NewCustomerForm({
  initialName,
  onCancel,
  onCreate,
}: {
  initialName: string;
  onCancel: () => void;
  onCreate: (input: NewCustomerInput) => Promise<void>;
}) {
  const [name, setName] = useState(initialName.includes("@") ? "" : initialName);
  const [email, setEmail] = useState(initialName.includes("@") ? initialName : "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nameRef = useAutoFocus<HTMLInputElement>(true);

  async function save() {
    if (busy) return;
    if (!name.trim()) return setError("Enter the customer's name.");
    if (!EMAIL_PATTERN.test(email.trim())) return setError("Enter a valid email address.");
    setBusy(true);
    setError("");
    try {
      await onCreate({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not add the customer.");
      setBusy(false);
    }
  }

  const input = "h-10 w-full rounded-lg border border-slate-200 px-3 text-[14px] outline-none placeholder:text-slate-400 focus:border-[#5A4FCF]";
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="space-y-2.5"
    >
      <p className="text-[14px] font-semibold text-slate-800">New Customer</p>
      <input
        ref={nameRef}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Full name"
        aria-label="Customer name"
        className={input}
      />
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email address"
        aria-label="Customer email"
        className={input}
      />
      <input
        type="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Phone (optional)"
        aria-label="Customer phone"
        className={input}
      />
      {error ? <p className="text-[12px] font-medium text-rose-600">{error}</p> : null}
      <div className="flex gap-2 pt-0.5">
        <button
          type="submit"
          disabled={busy}
          className="h-10 flex-1 rounded-lg bg-[#5A4FCF] text-[14px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add Customer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-lg border border-slate-200 px-4 text-[14px] font-medium text-slate-600 hover:bg-slate-50"
        >
          Back
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Payment Details                                                            */
/* -------------------------------------------------------------------------- */

export function PaymentDetailsCard({
  price,
  currency,
  status,
  paidText,
  onStatusChange,
  onPaidTextChange,
}: {
  price: number;
  currency?: BookingCurrency;
  status: PaymentStatus;
  paidText: string;
  onStatusChange: (status: PaymentStatus) => void;
  onPaidTextChange: (text: string) => void;
}) {
  const left = amountToBePaid(price, parsePaidAmount(paidText));
  return (
    <div>
      <p className="mb-1.5 text-[13px] text-slate-500">Payment Details</p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex gap-2" role="group" aria-label="Payment status">
          {(["Due", "Paid"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={status === item}
              onClick={() => onStatusChange(item)}
              className={cn(
                "h-9 min-w-[72px] rounded-lg border px-4 text-[14px] font-medium transition-colors",
                status === item
                  ? "border-[#5A4FCF] bg-[#EEEDFB] text-[#5A4FCF]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="mt-3 mb-1.5 text-[12px] text-slate-500">Payment Details</p>
        <div className="flex items-center gap-3">
          <div className="flex h-10 min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-[#5A4FCF]">
            <span className="flex items-center border-r border-slate-200 bg-slate-100 px-3 text-[13px] font-medium text-slate-500">
              {currencyPrefix(currency)}
            </span>
            <input
              inputMode="decimal"
              value={paidText}
              onChange={(event) => onPaidTextChange(event.target.value.replace(/[^\d.,]/g, ""))}
              aria-label="Amount paid"
              className="min-w-0 flex-1 px-3 text-[14px] text-slate-800 outline-none"
            />
          </div>
          <p className="shrink-0 text-[13px] font-medium text-rose-500">
            To Be Paid: {formatAppointmentAmount(left, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
