"use client";

import * as React from "react";
import { clearPendingVerificationEmail } from "@/lib/auth/pending-verification";

export function SignOutOtherAccountButton() {
  const [busy, setBusy] = React.useState(false);

  async function signOut() {
    setBusy(true);
    try {
      clearPendingVerificationEmail();
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      /* still bounce to signup */
    }
    window.location.href = "/signup";
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className="mt-3 text-sm font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Not you? Sign out and use another account"}
    </button>
  );
}
