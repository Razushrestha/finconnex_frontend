"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { clearCrmTokens } from "@/lib/activity-timeline/auth";
import { cn } from "@/lib/utils";

/**
 * Replaces the signed-in user's password. A member an admin created lands here
 * on first sign-in: the password they were sent is known to someone else, and
 * the CRM serves nothing else until it's replaced. Success signs out every
 * session, so the user signs in again with the new password.
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!currentPassword) {
      setError("Enter the password you signed in with.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password different from your current one.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords don't match.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/password/change", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          newPasswordConfirmation: confirmPassword,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Your password couldn't be changed. Try again.");
        setIsLoading(false);
        return;
      }
      // Every session ended with the change; drop the browser's CRM tokens too.
      clearCrmTokens();
      window.location.href = "/login?reason=password_changed";
    } catch {
      setError("Network error. Check your connection and try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}
      <div className="space-y-1.5">
        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
          Current password
        </label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          placeholder="The password you signed in with"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
          New password
        </label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm new password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Change password"
        )}
      </button>
    </form>
  );
}
