"use client";

import React from "react";

export interface TimelineEvent {
  id: string;
  title: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <div className="space-y-3 text-xs border-l-2 border-border pl-3 ml-1">
      {events.map((event) => (
        <div key={event.id} className="relative">
          <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-primary ring-4 ring-background" />
          <p className="font-medium text-card-foreground">{event.title}</p>
          <p className="text-muted-foreground">{event.timestamp}</p>
        </div>
      ))}
    </div>
  );
}
