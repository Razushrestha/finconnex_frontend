"use client";

import { clearCrmTokens } from "@/lib/activity-timeline/auth";

/** Signs out and returns to the sign-in page. */
export function SignOutLink() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(
          () => undefined,
        );
        clearCrmTokens();
        window.location.href = "/login";
      }}
      className="font-medium text-violet-600 hover:text-violet-700"
    >
      Sign out
    </button>
  );
}
