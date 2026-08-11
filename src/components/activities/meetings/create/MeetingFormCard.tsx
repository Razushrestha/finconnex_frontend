"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Clock,
  Calendar,
  Video,
  Users,
  Link2,
  Building,
  Monitor,
  Search,
  Plus,
} from "lucide-react";
import { MeetingType, MEETING_TYPES, Attendee } from "@/lib/meetings/types";

// Sample global directory of users to search from
const ALL_AVAILABLE_USERS: Attendee[] = [
  { id: "u1", name: "Sarah Jenkins", email: "sarah@example.com" },
  { id: "u2", name: "Michael Torres", email: "michael@example.com" },
  { id: "u3", name: "Shiva Khadka", email: "shiva.khadka@example.com" },
  { id: "u4", name: "Tejas Gokhe", email: "tejas@example.com" },
  { id: "u5", name: "Roshna Abraham", email: "roshna@example.com" },
];

interface MeetingFormCardProps {
  title: string;
  onTitleChange: (val: string) => void;
  date: string;
  onDateChange: (val: string) => void;
  time: string;
  onTimeChange: (val: string) => void;
  duration: string;
  onDurationChange: (val: string) => void;
  meetingType: MeetingType;
  onMeetingTypeChange: (type: MeetingType) => void;
  meetingLink: string;
  onMeetingLinkChange: (val: string) => void;
  attendees: Attendee[];
  onRemoveAttendee: (id: string) => void;
  onAddAttendee: (attendee: Attendee) => void;
  agenda: string;
  onAgendaChange: (val: string) => void;
}

export const MeetingFormCard: React.FC<MeetingFormCardProps> = ({
  title,
  onTitleChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  duration,
  onDurationChange,
  meetingType,
  onMeetingTypeChange,
  meetingLink,
  onMeetingLinkChange,
  attendees,
  onRemoveAttendee,
  onAddAttendee,
  agenda,
  onAgendaChange,
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown and reset state when clicking outside
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

  // Automatically focus search input when opened
  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  // Filter out already selected attendees and match search query
  const filteredUsers = ALL_AVAILABLE_USERS.filter(
    (user) =>
      !attendees.some((a) => a.id === user.id) &&
      (user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())),
  );

  const getTypeIcon = (type: MeetingType) => {
    switch (type) {
      case "Video Call":
        return <Video className="h-3.5 w-3.5" />;
      case "Conference":
        return <Monitor className="h-3.5 w-3.5" />;
      case "In-person":
        return <Building className="h-3.5 w-3.5" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-md border border-border p-4 shadow-sm space-y-5">
      {/* Meeting Title */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Meeting Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Q3 Strategy Review with Acme Corp"
          className="w-full bg-input/50 border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Date, Time, Duration Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Date
          </label>
          <div className="flex items-center bg-input/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <Calendar className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <input
              type="text"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent focus:outline-none w-full"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Time
          </label>
          <div className="flex items-center bg-input/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <input
              type="text"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="bg-transparent focus:outline-none w-full"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Duration
          </label>
          <input
            type="text"
            value={duration}
            onChange={(e) => onDurationChange(e.target.value)}
            className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Location / Meeting Type selector */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Location / Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MEETING_TYPES.map((type) => {
            const isSelected = meetingType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onMeetingTypeChange(type)}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                }`}
              >
                {getTypeIcon(type)}
                <span>{type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Meeting Link */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Meeting Link
        </label>
        <div className="flex items-center bg-input/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground">
          <Link2 className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <input
            type="text"
            value={meetingLink}
            onChange={(e) => onMeetingLinkChange(e.target.value)}
            placeholder="https://zoom.us/j/..."
            className="bg-transparent focus:outline-none w-full text-primary font-mono text-xs"
          />
        </div>
      </div>

      {/* Participants with Plus Button & Search Popup */}
      <div className="space-y-1.5 relative" ref={containerRef}>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Participants
        </label>

        <div className="flex flex-wrap items-center gap-2 bg-input/50 border border-border rounded-lg p-2 min-h-[44px]">
          {/* Selected Participant Chips */}
          {attendees.map((attendee) => (
            <span
              key={attendee.id}
              className="inline-flex items-center bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md text-xs font-medium border border-border space-x-1.5"
            >
              <Users className="h-3 w-3 text-muted-foreground" />
              <span>{attendee.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAttendee(attendee.id)}
                className="text-muted-foreground hover:text-destructive font-bold ml-1"
              >
                ×
              </button>
            </span>
          ))}

          {/* Plus Add Button / Trigger */}
          {!isOpen ? (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary transition-colors bg-card"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add participant</span>
            </button>
          ) : (
            <div className="flex items-center flex-1 min-w-[140px] px-1 bg-input/80 rounded border border-border">
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

        {/* Dropdown Options List */}
        {isOpen && (
          <div className="absolute left-0 right-0 mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    onAddAttendee(user);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="px-3 py-2.5 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer flex flex-col border-b border-border/50 last:border-none"
                >
                  <span className="font-semibold text-foreground">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                No matching participants found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agenda & Notes */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Agenda & Notes
        </label>
        <textarea
          rows={4}
          value={agenda}
          onChange={(e) => onAgendaChange(e.target.value)}
          placeholder="Outline the key topics to be discussed..."
          className="w-full bg-input/50 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none"
        />
      </div>
    </div>
  );
};
