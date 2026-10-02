import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

/**
 * Every user assigned to the event type, one row each, in the public booking
 * panels. A single assignee renders exactly as the old one-host row did.
 */
export function AssignedHosts({ names }: { names: string[] }) {
  const list = names.length ? names : ["Host"];
  return (
    <ul
      aria-label="Assigned users"
      className="m-0 flex list-none flex-col gap-2 p-0 text-[13px] text-slate-600"
    >
      {list.map((name) => (
        <li key={name} className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white",
              avatarColor(name),
            )}
          >
            {initials(name)}
          </span>
          <span className="truncate">{name}</span>
        </li>
      ))}
    </ul>
  );
}
