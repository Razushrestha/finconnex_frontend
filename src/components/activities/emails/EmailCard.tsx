"use client";

import { AlertTriangle, Clock, Mail } from "lucide-react";
import type { Email } from "@/lib/emails/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion, cardSubject, entityCardBox } from "@/lib/motion";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";
import { useRouter } from "next/navigation";

interface EmailCardProps {
  email: Email;
  columnId: string;
  onDragPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragClickCapture?: (e: React.MouseEvent) => void;
  isDragging: boolean;
}

export function EmailCard({
  email,
  columnId,
  onDragPointerDown,
  onDragClickCapture,
  isDragging,
}: EmailCardProps) {
  const router = useRouter();
  return (
    <div
      draggable={false}
      onPointerDown={onDragPointerDown}
      onClickCapture={onDragClickCapture}
      onDragStart={(e) => e.preventDefault()}
      onClick={() => router.push(`/activities/emails/detail/${email.id}`)}
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

      <h4
        className={cn(
          "mb-1.5 truncate text-sm font-semibold text-card-foreground",
          cardSubject,
        )}
      >
        {email.subject}
      </h4>

      {/*
        A failed send sits in Drafts alongside mail that was never sent (see
        emailMatchesFolder), which is the right folder — it can be edited and
        retried — but with no marker the two are indistinguishable, so a
        message that failed to send reads as one nobody ever sent.
      */}
      {email.status === "Failed" && (
        <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Not sent — delivery failed
        </p>
      )}

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
