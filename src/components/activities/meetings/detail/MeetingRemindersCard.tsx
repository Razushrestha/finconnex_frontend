"use client";

import { useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import ReminderModal from "@/components/activities/tasks/ReminderModal";
import {
  createTaskReminder,
  formatTaskReminderWhen,
  reminderNotify,
  type TaskReminder,
} from "@/lib/tasks/types";
import { useRelatedCrmReminders } from "@/lib/reminders/use-related-crm-reminders";
import { cn } from "@/lib/utils";

interface MeetingRemindersCardProps {
  meetingId: string;
  dueDate?: string;
}

function dueDateToInput(value?: string): string {
  if (!value) return "";
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : "";
}

export function MeetingRemindersCard({
  meetingId,
  dueDate,
}: MeetingRemindersCardProps) {
  const crm = useRelatedCrmReminders("Meeting", meetingId);
  const [local, setLocal] = useState<TaskReminder[]>([]);
  const [editor, setEditor] = useState<TaskReminder | null>(null);
  const [isNew, setIsNew] = useState(false);
  const rows = crm.source === "api" ? crm.items : local;

  function openNew() {
    setIsNew(true);
    setEditor(
      createTaskReminder({
        type: "Follow-up",
        date: dueDateToInput(dueDate),
        time: "09:00",
        notify: "Email",
        notificationMethod: "Email",
      }),
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Reminder{rows.length ? `s (${rows.length})` : ""}
          {crm.source === "api" ? (
            <span
              className={cn(
                "ml-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700",
              )}
            >
              Live CRM
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={openNew}
          className="text-primary hover:opacity-80"
          title="Add reminder"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {rows.length === 0 ? (
        <button
          type="button"
          onClick={openNew}
          className="w-full rounded-xl border border-dashed border-primary/25 bg-primary/5 px-3 py-4 text-left"
        >
          <p className="text-xs font-semibold text-primary">Add a reminder</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Custom reminder on this meeting (Task, Call, or Meeting parent).
          </p>
        </button>
      ) : (
        <div className="space-y-2">
          {rows.map((item) => (
            <div
              key={item.id}
              className="group flex items-start gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-xs"
            >
              <button
                type="button"
                onClick={() => {
                  setIsNew(false);
                  setEditor(item);
                }}
                className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bell className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-card-foreground">
                    {formatTaskReminderWhen(item)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {item.type} · Notify {reminderNotify(item)}
                    {item.repeatType && item.repeatType !== "None"
                      ? ` · ${item.repeatType}`
                      : ""}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (crm.live) void crm.remove(item.id);
                  else setLocal(rows.filter((r) => r.id !== item.id));
                }}
                className="mt-1 rounded-md p-1 text-muted-foreground opacity-0 hover:bg-secondary hover:text-rose-500 group-hover:opacity-100"
                aria-label="Delete reminder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editor ? (
        <ReminderModal
          open
          value={editor}
          dueDate={dueDate}
          onCancel={() => {
            setEditor(null);
            setIsNew(false);
          }}
          onDone={(next) => {
            void (async () => {
              if (isNew && crm.live) {
                try {
                  await crm.create(next);
                } catch {
                  setLocal([...rows, next]);
                }
              } else if (isNew) {
                setLocal([...rows, next]);
              } else if (!crm.live) {
                setLocal(rows.map((item) => (item.id === next.id ? next : item)));
              }
              setEditor(null);
              setIsNew(false);
            })();
          }}
        />
      ) : null}
    </div>
  );
}
