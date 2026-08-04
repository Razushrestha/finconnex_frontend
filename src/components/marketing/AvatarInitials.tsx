import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

interface AvatarInitialsProps {
  name: string;
  className?: string;
}

/** "Created by" avatar used in every campaign table. */
export function AvatarInitials({ name, className }: AvatarInitialsProps) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold",
        avatarColor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
