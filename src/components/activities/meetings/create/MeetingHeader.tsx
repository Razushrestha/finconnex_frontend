"use client";

import React from "react";

interface MeetingHeaderProps {
  onCancel: () => void;
  onSendInvites: () => void;
}

export const MeetingHeader: React.FC<MeetingHeaderProps> = ({
  onCancel,
  onSendInvites,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border gap-4">
      <div className="flex items-start space-x-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Schedule Meeting
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coordinate with clients and internal stakeholders to push deals
            forward.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold text-secondary-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border border-border"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSendInvites}
          className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
        >
          Send Invites
        </button>
      </div>
    </div>
  );
};
