"use client";

import React from "react";
import { X } from "lucide-react";

interface MeetingHeaderProps {
  onCancel: () => void;
  onSendInvites: () => void;
}

export const MeetingHeader: React.FC<MeetingHeaderProps> = ({
  onCancel,
  onSendInvites,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <h1 className="text-base font-semibold text-foreground">
        Schedule Meeting
      </h1>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={onSendInvites}
          className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Send Invites
        </button>
      </div>
    </div>
  );
};
