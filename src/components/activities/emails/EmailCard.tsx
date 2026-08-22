"use client";

import { Mail, Clock } from "lucide-react";
import type { Email } from "@/lib/emails/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion, cardSubject, entityCardBox } from "@/lib/motion";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";
import Link from "next/link";

interface EmailCardProps {
  email: Email;
  columnId: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function EmailCard({
  email,
  columnId,
  onDragStart,
  onDragEnd,
  isDragging,
}: EmailCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-focus-id={email.id}
      data-email-id={email.id}
      data-column-id={columnId}
      className={cn(
        entityCardBox,
        "group/card",
        cardMotion,
        isDragging && cardDragging,
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
        <Mail className="h-3.5 w-3.5" />
        {email.relatedTo ?? "Unrelated"}
      </div>

      <Link
        href={`/activities/emails/detail/${email.id}`}
        className="block group cursor-pointer"
      >
        <h4
          className={cn(
            "mb-1.5 truncate text-sm font-semibold text-card-foreground transition-colors group-hover:text-primary",
            cardSubject,
          )}
        >
          {email.subject}
        </h4>
      </Link>

      <p className="mb-1 truncate text-xs text-slate-500">
        To: {email.to.join(", ")}
      </p>

      <div className="space-y-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{email.sentDate ?? "N/A"}</span>
        </div>
        <CardOwnerRow name={email.from} />
      </div>
    </div>
  );
}
