"use client";

import { useMemo, useState } from "react";
import { toast } from "@/lib/notify/toast";
import { Search, Trash2, UserPlus, X } from "lucide-react";
import {
  MEETING_ATTENDEE_ROLES,
  type Attendee,
  type Meeting,
  type MeetingAttendanceStatus,
  type MeetingAttendeeRole,
} from "@/lib/meetings/types";
import { updateMeeting } from "@/lib/meetings/store";
import { withResolvedRoles } from "@/lib/meetings/roles";
import { listAllContacts } from "@/lib/contacts/store";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { getRulesActor } from "@/lib/rules/actor";
import { newRulesId } from "@/lib/rules/storage";
import { cn } from "@/lib/utils";

const ATTENDANCE: MeetingAttendanceStatus[] = [
  "Invited",
  "Accepted",
  "Declined",
  "Tentative",
];

function emailKey(email: string) {
  return email.trim().toLowerCase();
}

export function ManageAttendeesModal({
  meeting,
  onClose,
}: {
  meeting: Meeting;
  onClose: () => void;
}) {
  const [attendees, setAttendees] = useState<Attendee[]>(() =>
    withResolvedRoles(meeting),
  );
  const [query, setQuery] = useState("");
  const [roleDraft, setRoleDraft] = useState<MeetingAttendeeRole>("Guest");
  const contacts = useMemo(() => listAllContacts(), []);
  const taken = useMemo(
    () => new Set(attendees.map((a) => emailKey(a.email))),
    [attendees],
  );

  const directory = useMemo(() => {
    const fromContacts = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      source: "contact" as const,
    }));
    const fromUsers = ACTIVITY_OWNERS.map((name) => ({
      id: `user:${name}`,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@finconnex.com`,
      phone: undefined as string | undefined,
      source: "user" as const,
    }));
    const all = [...fromUsers, ...fromContacts];
    const q = query.trim().toLowerCase();
    return all
      .filter((row) => !taken.has(emailKey(row.email)))
      .filter((row) => {
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          (row.phone?.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 12);
  }, [contacts, query, taken]);

  function persist(next: Attendee[], message?: string) {
    setAttendees(next);
    const saved = updateMeeting(meeting.id, { attendees: next });
    if (saved) toast.success(message ?? "Attendees updated");
  }

  function addPerson(person: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  }) {
    if (taken.has(emailKey(person.email))) {
      toast.error("That person is already an attendee");
      return;
    }
    persist(
      [
        ...attendees,
        {
          id: person.id.startsWith("user:") ? newRulesId("att") : person.id,
          name: person.name,
          email: person.email,
          phone: person.phone,
          role: roleDraft,
          attendanceStatus: "Invited",
        },
      ],
      `Added ${person.name}`,
    );
    setQuery("");
  }

  function removeAttendee(id: string) {
    persist(
      attendees.filter((a) => a.id !== id),
      "Attendee removed",
    );
  }

  function patchAttendee(id: string, patch: Partial<Attendee>) {
    persist(
      attendees.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      "Attendee updated",
    );
  }

  function sendInvites() {
    const actor = getRulesActor().name || "User";
    toast.success(`Invitations updated by ${actor}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Manage Attendees
            </h3>
            <p className="text-[11px] text-slate-500">{meeting.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-9 min-w-[180px] flex-1 items-center gap-1.5 rounded-lg bg-slate-50 px-2 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-violet-500">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contacts or users…"
                className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-slate-400"
              />
            </label>
            <select
              value={roleDraft}
              onChange={(e) =>
                setRoleDraft(e.target.value as MeetingAttendeeRole)
              }
              className="h-9 rounded-lg border border-slate-200 px-2 text-[12px]"
            >
              {MEETING_ATTENDEE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {query.trim() || directory.length > 0 ? (
            <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-100">
              {directory.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-slate-400">
                  No matching contacts or users
                </p>
              ) : (
                directory.map((person) => (
                  <button
                    key={`${person.source}-${person.email}`}
                    type="button"
                    onClick={() => addPerson(person)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-violet-50"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-violet-600" />
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                      {person.name}
                    </span>
                    <span className="truncate text-slate-400">
                      {person.email}
                    </span>
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {person.source === "user" ? "Internal" : "Contact"}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          <ul className="space-y-2">
            {attendees.map((attendee) => (
              <li
                key={attendee.id}
                className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-900">
                      {attendee.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {attendee.email}
                      {attendee.phone ? ` · ${attendee.phone}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <select
                        value={attendee.role ?? "Guest"}
                        onChange={(e) =>
                          patchAttendee(attendee.id, {
                            role: e.target.value as MeetingAttendeeRole,
                          })
                        }
                        className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px]"
                      >
                        {MEETING_ATTENDEE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <select
                        value={attendee.attendanceStatus ?? "Invited"}
                        onChange={(e) =>
                          patchAttendee(attendee.id, {
                            attendanceStatus: e.target
                              .value as MeetingAttendanceStatus,
                          })
                        }
                        className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px]"
                      >
                        {ATTENDANCE.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Remove attendee"
                    onClick={() => removeAttendee(attendee.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={sendInvites}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Send / update invitation
          </button>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-violet-700",
            )}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
