"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  CustomerPicker,
  DateTimePicker,
  EventTypePicker,
  PaymentDetailsCard,
  UserPicker,
  type EventTypeOption,
  type NewCustomerInput,
  type UserOption,
} from "@/components/booking/AppointmentPickers";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  BookingSlotUnavailableError,
  bookingCrmLinkFromRelated,
  createCrmBooking,
  linkCrmBooking,
  listCrmAvailableSlots,
  listCrmBookings,
  listCrmEventTypeHosts,
  listCrmEventTypePages,
  mergeCrmEventTypePages,
  tryCrmBooking,
} from "@/lib/booking/api";
import {
  appointmentProblem,
  chooseHost,
  composeInternalNotes,
  customersFromBookings,
  defaultPaidAmount,
  describeSlot,
  groupSlotsByDay,
  hasPrice,
  localPageSlots,
  monthBounds,
  parsePaidAmount,
  paymentNote,
  shiftMonth,
  zonedDateKey,
  type AppointmentCustomer,
  type AppointmentSlot,
  type CustomerSource,
  type PaymentStatus,
} from "@/lib/booking/new-appointment";
import { ianaTimezoneFromLabel } from "@/lib/booking/timezones";
import {
  assignedCalendarMembers,
  bookingLocationLabel,
  listBookingPages,
  type BookingPage,
} from "@/lib/booking/types";
import { createContact, listAllContacts, updateContact } from "@/lib/contacts/store";
import { listLeadColumns } from "@/lib/leads/store";
import { fetchCrmRelatedRecords } from "@/lib/activities/related-records";
import { createCrmMeeting } from "@/lib/meetings/api";
import type { MeetingType } from "@/lib/meetings/types";
import { toast } from "@/lib/notify/toast";
import { getRulesActor } from "@/lib/rules/actor";
import { cn } from "@/lib/utils";

type PickerName = "event" | "user" | "date" | "customer" | null;
type Hosts = { key: string; list: UserOption[] };
type LoadedSlots = { key: string; days: Map<string, AppointmentSlot[]>; error: string };

const NO_DAYS = new Map<string, AppointmentSlot[]>();
const NOTES_MAX = 4000;

function browserZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** The backend sometimes appends a stack trace and an exception class name. */
function readableError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : "";
  const message = raw
    .replace(/\s+at\s+\S+\s+\([^)]+\)[\s\S]*$/u, "")
    .replace(/(?:^|[;\s]+)(?:Conflict|BadRequest|NotFound)Exception:\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return message || fallback;
}

async function loadCustomers(source: CustomerSource): Promise<AppointmentCustomer[]> {
  if (source === "Bookings") {
    const rows = await tryCrmBooking(() => listCrmBookings());
    return customersFromBookings(rows ?? []);
  }
  if (source === "Contacts") {
    // Pulls the CRM's contacts into the local board, which is what we read.
    await fetchCrmRelatedRecords("Contact").catch(() => []);
    return listAllContacts()
      .filter((contact) => contact.name.trim())
      .map<AppointmentCustomer>((contact) => ({
        key: `contact:${contact.id}`,
        name: contact.name.trim(),
        email: contact.email.trim(),
        phone: (contact.mobile || contact.phone || "").trim() || undefined,
        contactId: isUuid(contact.id) ? contact.id : undefined,
        source: "Contacts",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  await fetchCrmRelatedRecords("Lead").catch(() => []);
  return listLeadColumns()
    .flatMap((column) => column.cards)
    .filter((card) => card.name.trim())
    .map<AppointmentCustomer>((card) => ({
      key: `lead:${card.id}`,
      name: card.name.trim(),
      email: card.email.trim(),
      phone: card.phone.trim() || undefined,
      leadId: isUuid(card.id) ? card.id : undefined,
      source: "Leads",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function NewAppointmentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  // Mounting the dialog only while open gives every visit a fresh, empty form.
  if (!open) return null;
  return <AppointmentDialog onClose={onClose} onCreated={onCreated} />;
}

function AppointmentDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const pressedOnBackdrop = useRef(false);
  const dismissedPicker = useRef(false);
  const [viewerZone] = useState(browserZone);

  const [openPicker, setOpenPicker] = useState<PickerName>(null);
  const [pages, setPages] = useState<BookingPage[]>(() =>
    listBookingPages().filter((page) => page.eventType === "Consultation"),
  );
  const [pagesLoading, setPagesLoading] = useState(true);

  const [pageId, setPageId] = useState("");
  const [hostChoice, setHostChoice] = useState<"random" | string>("random");
  const [hostsLoaded, setHostsLoaded] = useState<Hosts | null>(null);

  const [view, setView] = useState(() => {
    const today = zonedDateKey(new Date(), browserZone());
    return { year: Number(today.slice(0, 4)), month0: Number(today.slice(5, 7)) - 1 };
  });
  const [selectedDate, setSelectedDate] = useState(() => zonedDateKey(new Date(), browserZone()));
  const [slot, setSlot] = useState<AppointmentSlot | null>(null);
  const [slotsLoaded, setSlotsLoaded] = useState<LoadedSlots | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [source, setSource] = useState<CustomerSource>("Bookings");
  const [people, setPeople] = useState<Partial<Record<CustomerSource, AppointmentCustomer[]>>>({});
  const [customer, setCustomer] = useState<AppointmentCustomer | null>(null);

  const [notify, setNotify] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [payStatus, setPayStatus] = useState<PaymentStatus>("Due");
  const [paidText, setPaidText] = useState("0");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showMissing, setShowMissing] = useState(false);

  /* ---------------------------- event types ---------------------------- */

  useEffect(() => {
    let alive = true;
    void (async () => {
      const remote = await tryCrmBooking(() => listCrmEventTypePages());
      const local = listBookingPages().filter((page) => page.eventType === "Consultation");
      const merged =
        remote == null
          ? local
          : mergeCrmEventTypePages(local, remote).filter(
              (page) => page.eventType === "Consultation",
            );
      if (!alive) return;
      setPages(merged);
      setPagesLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // An inactive event type is refused by the backend, so it is not offered.
  const options = useMemo<EventTypeOption[]>(
    () =>
      pages
        .filter((page) => page.status === "Live")
        .map((page) => ({
          id: page.id,
          name: page.title,
          price: page.price,
          currency: page.currency,
        })),
    [pages],
  );
  const page = pages.find((item) => item.id === pageId);
  const crmId = page ? page.crmEventTypeId || page.id : "";
  const crmBacked = Boolean(page) && isUuid(crmId);
  const zone = page ? ianaTimezoneFromLabel(page.timezone) : viewerZone;
  const todayKey = zonedDateKey(new Date(), zone);

  /* ------------------------------- users ------------------------------- */

  const localMembers = page ? assignedCalendarMembers(page).join("|") : "";
  useEffect(() => {
    if (!crmBacked) return;
    let alive = true;
    const key = crmId;
    void listCrmEventTypeHosts(crmId)
      .catch(() => [])
      .then((rows) => {
        if (!alive) return;
        setHostsLoaded({
          key,
          list: rows
            .filter((host) => host.active !== false)
            .map((host) => ({ id: host.id, name: host.name || host.email })),
        });
      });
    return () => {
      alive = false;
    };
  }, [crmBacked, crmId]);

  const users: UserOption[] = !page
    ? []
    : crmBacked
      ? hostsLoaded?.key === crmId
        ? hostsLoaded.list
        : []
      : localMembers
          .split("|")
          .filter(Boolean)
          .map((name) => ({ id: name, name }));

  /* -------------------------------- slots ------------------------------ */

  const hostFilter = hostChoice === "random" ? "" : hostChoice;
  const slotKey = crmBacked
    ? `${crmId}|${hostFilter}|${view.year}-${view.month0}|${zone}|${reloadTick}`
    : "";

  useEffect(() => {
    if (openPicker !== "date" || !crmBacked || !slotKey) return;
    if (slotsLoaded?.key === slotKey) return;
    let alive = true;
    const { from, to } = monthBounds(view.year, view.month0);
    void listCrmAvailableSlots({
      eventTypeId: crmId,
      from,
      to,
      hostId: hostFilter || undefined,
      timezone: zone,
    })
      .then((rows) => ({ days: groupSlotsByDay(rows, zone), error: "" }))
      .catch((err: unknown) => ({
        days: NO_DAYS,
        error: readableError(err, "Could not load available times."),
      }))
      .then((result) => {
        if (alive) setSlotsLoaded({ key: slotKey, ...result });
      });
    return () => {
      alive = false;
    };
  }, [openPicker, crmBacked, crmId, slotKey, slotsLoaded?.key, view.year, view.month0, hostFilter, zone]);

  const localDays = useMemo(
    () => (page && !crmBacked ? localPageSlots(page, view.year, view.month0, zone) : NO_DAYS),
    [page, crmBacked, view.year, view.month0, zone],
  );
  const slotsReady = crmBacked ? slotsLoaded?.key === slotKey : true;
  const slotDays = crmBacked ? (slotsReady ? slotsLoaded!.days : NO_DAYS) : localDays;
  const slotsError = crmBacked && slotsReady ? slotsLoaded!.error : "";

  /* ------------------------------ customers ---------------------------- */

  useEffect(() => {
    if (openPicker !== "customer" || people[source]) return;
    let alive = true;
    void loadCustomers(source)
      .catch(() => [] as AppointmentCustomer[])
      .then((list) => {
        if (alive) setPeople((current) => ({ ...current, [source]: list }));
      });
    return () => {
      alive = false;
    };
  }, [openPicker, source, people]);

  async function createCustomer(input: NewCustomerInput): Promise<AppointmentCustomer> {
    const parts = input.name.split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? input.name;
    const lastName = parts.slice(1).join(" ");
    const created = await createContact({
      firstName,
      // The CRM wants a last name; a one-word name is shown as typed below.
      lastName: lastName || firstName,
      email: input.email,
      phone: input.phone || undefined,
      status: "Active",
      owner: getRulesActor().name || "",
      source: "Other",
    });
    const named =
      created.name !== input.name ? (updateContact(created.id, { name: input.name }) ?? created) : created;
    const made: AppointmentCustomer = {
      key: `contact:${named.id}`,
      name: named.name || input.name,
      email: named.email || input.email,
      phone: named.phone || input.phone || undefined,
      contactId: isUuid(named.id) ? named.id : undefined,
      source: "Contacts",
    };
    setPeople((current) => ({
      ...current,
      Contacts: [made, ...(current.Contacts ?? []).filter((item) => item.key !== made.key)],
    }));
    setSource("Contacts");
    return made;
  }

  /* --------------------------- dismiss behaviour ------------------------ */

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (openPicker) setOpenPicker(null);
      else onClose();
    }
    function onPointerDown(event: PointerEvent) {
      dismissedPicker.current = false;
      if (!openPicker) return;
      const target = event.target instanceof Element ? event.target : null;
      const root = target?.closest("[data-picker]");
      if (root?.getAttribute("data-picker") !== openPicker) {
        // The same click must not also close the whole dialog.
        dismissedPicker.current = true;
        setOpenPicker(null);
      }
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openPicker, onClose]);

  /* ------------------------------- handlers ---------------------------- */

  function selectEventType(id: string) {
    const next = pages.find((item) => item.id === id);
    const nextZone = next ? ianaTimezoneFromLabel(next.timezone) : viewerZone;
    const today = zonedDateKey(new Date(), nextZone);
    setPageId(id);
    setHostChoice("random");
    setSlot(null);
    setSelectedDate(today);
    setView({ year: Number(today.slice(0, 4)), month0: Number(today.slice(5, 7)) - 1 });
    setError("");
    if (next && hasPrice(next.price)) {
      setPayStatus("Due");
      setPaidText(String(defaultPaidAmount("Due", next.price)));
    }
  }

  function changeStatus(status: PaymentStatus) {
    setPayStatus(status);
    if (page && hasPrice(page.price)) {
      setPaidText(String(defaultPaidAmount(status, page.price)));
    }
  }

  const problem = appointmentProblem({
    hasEventType: Boolean(page),
    hasSlot: Boolean(slot),
    customer,
    needsEmail: crmBacked,
  });

  async function submit() {
    if (saving) return;
    if (problem || !page || !slot || !customer) {
      setShowMissing(true);
      setError(problem ?? "Fill in the form first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const price = hasPrice(page.price) ? page.price : undefined;
      const internal = composeInternalNotes(
        notes,
        price != null
          ? paymentNote({
              status: payStatus,
              price,
              paid: parsePaidAmount(paidText),
              currency: page.currency,
            })
          : undefined,
      );
      const related = bookingCrmLinkFromRelated(
        customer.leadId ? "Lead" : customer.contactId ? "Contact" : "",
        customer.leadId || customer.contactId,
      );
      let notesKept = true;

      if (crmBacked) {
        // Slots are the CRM's own, so a refusal means someone else took the time.
        const hostId = slot.hostIds.length
          ? chooseHost(slot.hostIds, hostChoice)
          : hostChoice === "random"
            ? undefined
            : hostChoice;
        if (slot.hostIds.length && !hostId) throw new BookingSlotUnavailableError();
        const booked = await createCrmBooking({
          eventTypeId: crmId,
          startTime: slot.startTime,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          timezone: zone,
          hostId,
          internalNotes: internal || undefined,
          notifyInvitee: notify ? undefined : false,
          snapToleranceMs: 60_000,
          ...related,
        });
        if (isUuid(booked.id) && Object.keys(related).length) {
          await tryCrmBooking(() => linkCrmBooking(booked.id, related));
        }
        if (internal) notesKept = String(booked.raw.internalNotes ?? "").trim().length > 0;
      } else {
        const start = new Date(slot.startTime);
        const end = new Date(start.getTime() + (page.durationMinutes || 30) * 60_000);
        const hostName =
          users.find((user) => user.id === hostChoice)?.name ||
          users[Math.floor(Math.random() * Math.max(users.length, 1))]?.name ||
          getRulesActor().name ||
          "Host";
        const type: MeetingType =
          page.meetingVia === "phone"
            ? "Phone Call"
            : page.meetingVia === "in_person"
              ? "In-person"
              : "Video Call";
        const kind = customer.leadId ? "Lead" : customer.contactId ? "Contact" : "";
        await createCrmMeeting({
          title: page.title.trim() || "Consultation",
          type,
          status: "Scheduled",
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          organizer: hostName,
          relatedKind: kind,
          relatedId: customer.leadId || customer.contactId,
          relatedTo: kind ? `${kind}: ${customer.name}` : undefined,
          location: bookingLocationLabel(page),
          meetingLink: page.meetingViaDetail || page.videoLink || undefined,
          notes: internal || undefined,
          timezone: zone,
          externalAttendees:
            notify && customer.email
              ? [{ email: customer.email, name: customer.name }]
              : undefined,
        });
      }

      toast.success("Appointment added");
      if (!notesKept) {
        toast.warning("The appointment was added, but the CRM did not keep the notes.");
      }
      onCreated();
      onClose();
    } catch (err) {
      if (err instanceof BookingSlotUnavailableError) {
        setError("That time was just taken. Pick another time.");
        setSlot(null);
        setReloadTick((tick) => tick + 1);
        setOpenPicker("date");
      } else {
        setError(readableError(err, "Could not add the appointment."));
      }
    } finally {
      setSaving(false);
    }
  }

  const price = page && hasPrice(page.price) ? page.price : undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/20"
        // Closing takes a press and a release on the backdrop, so selecting text
        // and letting go outside the panel never throws the form away.
        onMouseDown={(event) => {
          pressedOnBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          const onlyDismissedPicker = dismissedPicker.current;
          dismissedPicker.current = false;
          if (event.target === event.currentTarget && pressedOnBackdrop.current && !onlyDismissedPicker) {
            onClose();
          }
          pressedOnBackdrop.current = false;
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-[400px] flex-col bg-white shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 id={titleId} className="text-[18px] font-semibold text-slate-900">
            New Appointment
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pt-2 pb-4">
            <EventTypePicker
              options={options}
              loading={pagesLoading}
              selectedId={pageId}
              open={openPicker === "event"}
              invalid={showMissing && !page}
              onOpenChange={(next) => setOpenPicker(next ? "event" : null)}
              onSelect={selectEventType}
            />

            <UserPicker
              users={users}
              value={hostChoice}
              open={openPicker === "user"}
              onOpenChange={(next) => setOpenPicker(next ? "user" : null)}
              onChange={(value) => {
                setHostChoice(value);
                setSlot(null);
              }}
            />

            <DateTimePicker
              open={openPicker === "date"}
              invalid={showMissing && Boolean(page) && !slot}
              display={slot ? describeSlot(slot.startTime, zone, viewerZone) : ""}
              year={view.year}
              month0={view.month0}
              todayKey={todayKey}
              selectedDate={selectedDate}
              days={slotDays}
              loading={!slotsReady}
              error={slotsError}
              hasEventType={Boolean(page)}
              selectedSlot={slot?.startTime ?? ""}
              onOpenChange={(next) => setOpenPicker(next ? "date" : null)}
              onMonthChange={(delta) => {
                const next = shiftMonth(view.year, view.month0, delta);
                setView(next);
                // Land on a day that is on screen: today this month, else the 1st.
                const first = monthBounds(next.year, next.month0).from;
                setSelectedDate(todayKey.slice(0, 7) === first.slice(0, 7) ? todayKey : first);
              }}
              onSelectDate={setSelectedDate}
              onSelectSlot={(chosen) => {
                setSlot(chosen);
                setError("");
                setOpenPicker(null);
              }}
            />

            <CustomerPicker
              open={openPicker === "customer"}
              invalid={showMissing && !customer}
              selected={customer}
              source={source}
              customers={people[source] ?? []}
              loading={openPicker === "customer" && !people[source]}
              onOpenChange={(next) => setOpenPicker(next ? "customer" : null)}
              onSourceChange={setSource}
              onSelect={(chosen) => {
                setCustomer(chosen);
                setError("");
              }}
              onCreate={createCustomer}
            />

            {price != null ? (
              <PaymentDetailsCard
                price={price}
                currency={page?.currency}
                status={payStatus}
                paidText={paidText}
                onStatusChange={changeStatus}
                onPaidTextChange={setPaidText}
              />
            ) : null}

            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-slate-700">
              <input
                type="checkbox"
                checked={notify}
                onChange={(event) => setNotify(event.target.checked)}
                className="h-[18px] w-[18px] rounded accent-[#5A4FCF]"
              />
              Send notifications for Customer
            </label>

            {showNotes ? (
              <div>
                <p className="mb-1.5 text-[13px] text-slate-500">Notes</p>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={NOTES_MAX}
                  rows={3}
                  placeholder="Internal notes — never shown to the customer"
                  aria-label="Notes"
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#5A4FCF]"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="text-[14px] font-medium text-[#5A4FCF] hover:underline"
              >
                + Add Notes
              </button>
            )}
          </div>

          <div className="px-6 pt-2 pb-6">
            <button
              type="button"
              onClick={() => void submit()}
              aria-disabled={Boolean(problem) || saving}
              className={cn(
                "h-12 w-full rounded-xl text-[15px] font-semibold text-white transition",
                problem ? "bg-[#A5A2D9]" : "bg-[#5A4FCF] hover:brightness-110",
                saving && "opacity-70",
              )}
            >
              {saving ? "Adding…" : "Add Appointment"}
            </button>
            {error ? (
              <p role="alert" className="mt-2 text-center text-[13px] font-medium text-rose-600">
                {error}
              </p>
            ) : null}
          </div>
      </div>
    </div>
  );
}
