"use client";

/**
 * Teammate picker shared by the step form's `member` widget and the
 * field-update editor's `ownerId` row. Extracted from StepConfigPanel so
 * FieldsEditor can use it without importing its own parent.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkspaceMember } from "@/lib/workspace-members/types";

export function MemberSelect({
  value,
  onChange,
  members,
  membersStatus,
}: {
  value: string;
  onChange: (v: string) => void;
  members: WorkspaceMember[];
  membersStatus: "loading" | "ready" | "error";
}) {
  const placeholder =
    membersStatus === "loading"
      ? "Loading teammates..."
      : membersStatus === "error"
        ? "Couldn't load teammates"
        : "Select a teammate...";
  return (
    <Select
      items={members.map((m) => ({ label: m.name || m.email, value: m.userId }))}
      value={value || null}
      onValueChange={(v) => v && onChange(v)}
    >
      <SelectTrigger className="h-9 w-full text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {members.map((m) => (
          <SelectItem key={m.userId} value={m.userId}>
            {m.name || m.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
