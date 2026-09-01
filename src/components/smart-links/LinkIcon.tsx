import {
  Link2,
  FileDown,
  PlayCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { LinkIconType } from "@/lib/broker-hub/types";

export const LINK_TYPE_META: Record<
  LinkIconType,
  { label: string; description: string; icon: LucideIcon }
> = {
  standard: {
    label: "Standard",
    description: "Direct URL redirection",
    icon: Link2,
  },
  file: {
    label: "File",
    description: "PDF or document download",
    icon: FileDown,
  },
  video: {
    label: "Video",
    description: "Embed or link video",
    icon: PlayCircle,
  },
  social: {
    label: "Social",
    description: "Link to social profiles",
    icon: Users,
  },
};

export function LinkIcon({
  type,
  className,
}: {
  type: LinkIconType;
  className?: string;
}) {
  const Icon = LINK_TYPE_META[type]?.icon ?? Link2;
  return <Icon className={className} />;
}

export const LINK_ICON_OPTIONS: { value: LinkIconType; label: string }[] = (
  Object.keys(LINK_TYPE_META) as LinkIconType[]
).map((value) => ({ value, label: LINK_TYPE_META[value].label }));
