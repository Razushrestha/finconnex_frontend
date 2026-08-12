"use client";

import React from "react";
import { Video, Phone, MapPin, ExternalLink, Copy } from "lucide-react";
import { MeetingType } from "@/lib/meetings/types";

interface MeetingInfoCardProps {
  type: MeetingType;
  location?: string;
  meetingLink?: string;
}

export function MeetingInfoCard({
  type,
  location,
  meetingLink,
}: MeetingInfoCardProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card/60 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          {type === "Video Call" || type === "Conference" ? (
            <Video className="w-5 h-5" />
          ) : type === "Phone Call" ? (
            <Phone className="w-5 h-5" />
          ) : (
            <MapPin className="w-5 h-5" />
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-card-foreground">{type}</h4>
          {meetingLink ? (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
            >
              {meetingLink} <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              {location || "No location specified"}
            </p>
          )}
        </div>
      </div>
      {meetingLink && (
        <button
          onClick={() => navigator.clipboard.writeText(meetingLink)}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors cursor-pointer"
          title="Copy Link"
        >
          <Copy className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
