"use client";

import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ArrowTagProps = {
  children: ReactNode;
  className?: string;
  compact?: boolean;
  title?: string;
  /** Bright fill. Inline so it always wins over the shared tag CSS. */
  color?: string;
  style?: CSSProperties;
} & (
  | ({ onClick?: never } & Omit<
      HTMLAttributes<HTMLSpanElement>,
      "className" | "children" | "title" | "style" | "color"
    >)
  | ({ onClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "className" | "children" | "title" | "style" | "color"
    >)
);

export function ArrowTag({
  children,
  className,
  compact = false,
  title,
  color,
  style,
  onClick,
  ...rest
}: ArrowTagProps) {
  const classes = cn(
    "fc-arrow-tag",
    compact && "fc-arrow-tag-compact",
    className,
  );
  const mergedStyle: CSSProperties = {
    ...style,
    ...(color ? { backgroundColor: color } : null),
  };

  if (onClick) {
    return (
      <button
        type="button"
        title={title}
        className={classes}
        style={mergedStyle}
        onClick={onClick}
        {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      title={title}
      className={classes}
      style={mergedStyle}
      {...(rest as HTMLAttributes<HTMLSpanElement>)}
    >
      {children}
    </span>
  );
}
