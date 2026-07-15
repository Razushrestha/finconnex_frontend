import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 shadow-xs transition-colors outline-none placeholder:text-gray-400 focus-visible:border-violet-500 focus-visible:ring-3 focus-visible:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-red-500/20 dark:border-input dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
