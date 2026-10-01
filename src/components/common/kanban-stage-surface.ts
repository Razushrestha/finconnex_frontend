import type { CSSProperties } from "react";
import { kanbanHeaderSurfaceStyle } from "@/components/common/KanbanViewControls";
import { KANBAN_HEADER } from "@/lib/layout";
import { cn } from "@/lib/utils";

export function stageHeaderSurface(color?: string): {
  className: string;
  style?: CSSProperties;
  titleStyle?: CSSProperties;
} {
  if (!color) {
    return { className: KANBAN_HEADER };
  }
  const surface = kanbanHeaderSurfaceStyle(color);
  return {
    className: cn(
      "flex h-14 w-full flex-col justify-center overflow-hidden rounded-xs p-1.5",
      surface.className,
    ),
    style: surface.style,
    titleStyle: { color },
  };
}
