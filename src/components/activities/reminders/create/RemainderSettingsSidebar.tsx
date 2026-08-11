"use client";

import React, { useState, useRef, useEffect } from "react";
import { Users, Search, Plus, Check } from "lucide-react";
import {
  NOTIFICATION_METHODS,
  NotificationMethod,
  REMINDER_OWNERS,
} from "@/lib/reminders/types"; // adjust path as needed

interface Assignee {
  id: string;
  name: string;
}

interface ReminderSettingsSidebarProps {
  notificationMethod: NotificationMethod;
  onNotificationMethodChange: (method: NotificationMethod) => void;
  frequency: string;
  onFrequencyChange: (val: string) => void;
  leadTime: string;
  onLeadTimeChange: (val: string) => void;
  assignees: Assignee[];
  onRemoveAssignee: (id: string) => void;
  onAddAssignee: (assignee: Assignee) => void;
}

const MOCK_TEAM_USERS: Assignee[] = [
  { id: "u1", name: "Alex Sterling" },
  { id: "u2", name: "Roshna Abraham" },
  { id: "u3", name: "Tejas Gokhe" },
  { id: "u4", name: "Shiva Khadka" },
];

export const ReminderSettingsSidebar: React.FC<
  ReminderSettingsSidebarProps
> = ({
  notificationMethod,
  onNotificationMethodChange,
  frequency,
  onFrequencyChange,
  leadTime,
  onLeadTimeChange,
  assignees,
  onRemoveAssignee,
  onAddAssignee,
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = MOCK_TEAM_USERS.filter(
    (user) =>
      !assignees.some((a) => a.id === user.id) &&
      user.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm space-y-6">
      {/* Delivery Method */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Delivery Method
        </h3>
        <div className="space-y-2">
          {NOTIFICATION_METHODS.map((method) => {
            const isSelected = notificationMethod === method;
            return (
              <label
                key={method}
                onClick={() => onNotificationMethodChange(method)}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-input/30 border-border hover:bg-input/60 text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="notificationMethod"
                  checked={isSelected}
                  onChange={() => {}}
                  className="mt-0.5 text-primary focus:ring-ring"
                />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">
                    {method === "In-app" ? "In-App Notification" : method}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {method === "In-app" && "Standard dashboard alert"}
                    {method === "Email" && "Sent to assigned user"}
                    {method === "SMS" && "Requires mobile number"}
                    {method === "Push" && "Instant mobile device ping"}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Frequency */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Frequency
        </label>
        <select
          value={frequency}
          onChange={(e) => onFrequencyChange(e.target.value)}
          className="w-full bg-input/50 hover:bg-input border border-border rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          <option
            value="Does not repeat"
            className="bg-popover text-popover-foreground"
          >
            Does not repeat
          </option>
          <option value="Daily" className="bg-popover text-popover-foreground">
            Daily
          </option>
          <option value="Weekly" className="bg-popover text-popover-foreground">
            Weekly
          </option>
          <option
            value="Monthly"
            className="bg-popover text-popover-foreground"
          >
            Monthly
          </option>
        </select>
      </div>

      {/* Lead Time */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Lead Time
        </label>
        <select
          value={leadTime}
          onChange={(e) => onLeadTimeChange(e.target.value)}
          className="w-full bg-input/50 hover:bg-input border border-border rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          <option
            value="15 minutes before"
            className="bg-popover text-popover-foreground"
          >
            15 minutes before
          </option>
          <option
            value="30 minutes before"
            className="bg-popover text-popover-foreground"
          >
            30 minutes before
          </option>
          <option
            value="1 hour before"
            className="bg-popover text-popover-foreground"
          >
            1 hour before
          </option>
          <option
            value="1 day before"
            className="bg-popover text-popover-foreground"
          >
            1 day before
          </option>
        </select>
      </div>

      {/* Assign To (Interactive Chips + Search Dropdown) */}
      <div className="space-y-2 relative" ref={containerRef}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Assign To
          </label>
          <button
            type="button"
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            Add Team
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-input/50 border border-border rounded-lg p-2 min-h-[44px]">
          {assignees.map((assignee) => (
            <span
              key={assignee.id}
              className="inline-flex items-center bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md text-xs font-medium border border-border space-x-1.5"
            >
              <span className="w-4 h-4 bg-primary text-primary-foreground rounded-full text-[9px] flex items-center justify-center font-bold">
                {assignee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
              <span>{assignee.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAssignee(assignee.id)}
                className="text-muted-foreground hover:text-destructive font-bold ml-1"
              >
                ×
              </button>
            </span>
          ))}

          {!isOpen ? (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              <Plus className="h-3 w-3" />
              <span>Search users...</span>
            </button>
          ) : (
            <div className="flex items-center flex-1 min-w-[120px] px-1 bg-input/80 rounded border border-border">
              <Search className="h-3 w-3 text-muted-foreground mr-1.5 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search user..."
                className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none w-full py-1"
              />
            </div>
          )}
        </div>

        {/* Dropdown list */}
        {isOpen && (
          <div className="absolute left-0 right-0 mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    onAddAssignee(user);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center justify-between border-b border-border/50 last:border-none"
                >
                  <span className="font-semibold text-foreground">
                    {user.name}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-3 py-2.5 text-xs text-muted-foreground text-center">
                No users found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
