"use client";

import {
  TextAreaShell,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
import type { MentionPerson } from "@/lib/mentions/people";
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
  people,
  error,
  className,
  placeholder = "Internal notes… Type @ to assign someone.",
  ...props
}: MentionNotesTextareaProps) {
  return (
    <TextAreaShell error={error}>
      <MentionTextarea
        value={value}
        onChange={onChange}
        onMentionSelect={onMentionSelect}
        people={people}
        className={className ?? elevatedTextareaClass}
        placeholder={placeholder}
        {...props}
      />
    </TextAreaShell>
  );
}
