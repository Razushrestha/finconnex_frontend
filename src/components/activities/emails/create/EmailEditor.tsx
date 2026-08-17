"use client";

import { TaskDescriptionEditor } from "@/components/activities/tasks/TaskDescriptionEditor";
import { EmailAiAssist } from "./EmailAiAssist";

interface EmailEditorProps {
  /** HTML string (contentEditable output), not plain text. */
  body: string;
  onChange: (value: string) => void;
  recipientName?: string;
  subject?: string;
  error?: string;
  submitted?: boolean;
}

export function EmailEditor({
  body,
  onChange,
  recipientName,
  subject,
  error,
  submitted,
}: EmailEditorProps) {
  return (
    <div className="px-5 py-4">
      <TaskDescriptionEditor
        value={body}
        onChange={onChange}
        placeholder="Write your email… Type @ to mention someone. Or use Voice / AI tones below."
        editorClassName="min-h-[220px]"
      />
      {submitted && error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : null}
      <EmailAiAssist
        html={body}
        onChange={onChange}
        recipientName={recipientName}
        subject={subject}
      />
    </div>
  );
}
