"use client";

import React from "react";
import { Paperclip } from "lucide-react";

interface EmailAttachmentProps {
  name: string;
  size: string;
  onClick?: () => void;
}

export function EmailAttachment({ name, size, onClick }: EmailAttachmentProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white max-w-sm hover:border-primary/50 transition-all cursor-pointer shadow-xs"
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Paperclip className="w-4 h-4" />
      </div>
      <div className="flex-1 text-sm overflow-hidden">
        <p className="font-medium text-card-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{size}</p>
      </div>
    </div>
  );
}
