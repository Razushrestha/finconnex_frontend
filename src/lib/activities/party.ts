import {
  ownerDisplayName,
  type OwnerLike,
} from "@/lib/users/display-name";

export function partyName(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  return ownerDisplayName(value as OwnerLike);
}

function titled(kind: string, name: string) {
  return name ? `${kind}: ${name}` : "";
}

/** First useful related label for an activity row. */
export function relatedActivityLabel(raw: Record<string, unknown>): string {
  const task =
    raw.task && typeof raw.task === "object"
      ? (raw.task as Record<string, unknown>)
      : null;
  const call =
    raw.call && typeof raw.call === "object"
      ? (raw.call as Record<string, unknown>)
      : null;
  const meeting =
    raw.meeting && typeof raw.meeting === "object"
      ? (raw.meeting as Record<string, unknown>)
      : null;
  return (
    titled("Deal", partyName(raw.deal)) ||
    titled("Contact", partyName(raw.contact)) ||
    titled("Lead", partyName(raw.lead)) ||
    titled("Company", partyName(raw.company)) ||
    titled("Task", typeof task?.subject === "string" ? task.subject : "") ||
    titled("Call", typeof call?.subject === "string" ? call.subject : "") ||
    titled("Meeting", typeof meeting?.title === "string" ? meeting.title : "")
  );
}

export function formatDurationSeconds(raw: unknown): string | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const seconds = Math.max(0, Math.round(raw));
    const mins = Math.floor(seconds / 60);
    const rest = seconds % 60;
    if (!mins) return `${seconds}s`;
    return rest ? `${mins}m ${rest}s` : `${mins}m`;
  }
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return undefined;
}
