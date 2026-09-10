"use client";

import { TaskDescriptionEditor } from "@/components/activities/tasks/TaskDescriptionEditor";
import type { MentionPerson } from "@/lib/mentions/people";
import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

interface MentionNotesTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect?: (person: MentionPerson) => void;
  people?: MentionPerson[];
  error?: boolean;
}

export function MentionNotesTextarea({
  value,
  onChange,
  onMentionSelect,
  error,
  className,
  placeholder = "Internal notes… Type @ to assign someone.",
}: MentionNotesTextareaProps) {
  return (
    <TaskDescriptionEditor
      variant="notes"
      value={value}
      onChange={onChange}
      onMentionSelect={onMentionSelect}
      placeholder={placeholder}
      className={cn(error && "border-rose-300", className)}
    />
  );
}
