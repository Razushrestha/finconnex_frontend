"use client";

import { emailAddressSuggestion } from "@/lib/emails/address";
import { cn } from "@/lib/utils";

/**
 * An email field's error line. When the message is a "Did you mean …?"
 * suggestion for the address in the field, the suggested address is a button
 * that puts it into the field.
 */
export function EmailProblemText({
  message,
  email,
  onUseSuggestion,
  className,
}: {
  message: string;
  /** The address currently in the field. */
  email: string;
  onUseSuggestion: (address: string) => void;
  className?: string;
}) {
  const suggestion = emailAddressSuggestion(email);
  if (!suggestion || message !== `Did you mean ${suggestion}?`) {
    return <p className={className}>{message}</p>;
  }
  return (
    <p className={className}>
      Did you mean{" "}
      <button
        type="button"
        onClick={() => onUseSuggestion(suggestion)}
        className={cn(
          "cursor-pointer font-semibold underline underline-offset-2",
          "hover:opacity-80 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
        )}
      >
        {suggestion}
      </button>
      ?
    </p>
  );
}
