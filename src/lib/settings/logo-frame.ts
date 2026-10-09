import type { CSSProperties } from "react";

export type LogoSlot = "logoLight" | "logoDark";

export type LogoFrame = {
  scale: number;
  x: number;
  y: number;
};

export const DEFAULT_LOGO_FRAME: LogoFrame = { scale: 1, x: 50, y: 50 };

export function logoFrameKeys(slot: LogoSlot) {
  return {
    scale: `${slot}Scale`,
    x: `${slot}X`,
    y: `${slot}Y`,
  } as const;
}

function readNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function readLogoFrame(
  source: Record<string, unknown> | null | undefined,
  slot: LogoSlot,
): LogoFrame {
  const keys = logoFrameKeys(slot);
  return {
    scale: readNumber(source?.[keys.scale], 1, 1, 3),
    x: readNumber(source?.[keys.x], 50, 0, 100),
    y: readNumber(source?.[keys.y], 50, 0, 100),
  };
}

export function logoFrameStyle(frame: LogoFrame): CSSProperties {
  return {
    width: `${frame.scale * 100}%`,
    height: `${frame.scale * 100}%`,
    left: `${frame.x}%`,
    top: `${frame.y}%`,
    transform: "translate(-50%, -50%)",
  };
}

export function isLogoSlot(id: string): id is LogoSlot {
  return id === "logoLight" || id === "logoDark";
}
