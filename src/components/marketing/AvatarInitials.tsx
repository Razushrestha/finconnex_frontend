import { CardInitialsAvatar } from "@/components/shared/CardInitialsAvatar";
import { cn } from "@/lib/utils";

interface AvatarInitialsProps {
  name: string;
  className?: string;
}

/** Created-by initials — same size/placement language as board cards. */
export function AvatarInitials({ name, className }: AvatarInitialsProps) {
  return <CardInitialsAvatar name={name} className={cn(className)} />;
}
