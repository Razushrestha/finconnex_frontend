"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { logAuth } from "@/lib/rules";

function getSafeDashboardUrl(callbackUrl: string | null): string {
  if (
    !callbackUrl ||
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    callbackUrl.startsWith("/login") ||
    callbackUrl.startsWith("/api")
  ) {
    return "/";
  }
  return callbackUrl;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const destination = getSafeDashboardUrl(searchParams.get("callbackUrl"));

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resendNote, setResendNote] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);

  const needsVerification = (error ?? "").toLowerCase().includes("verify");

  async function resendVerification() {
    if (!email.trim()) {
      setResendNote("Enter your email first.");
      return;
    }
    setResending(true);
    setResendNote(null);
    try {
      const response = await fetch("/api/auth/email-verification/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      setResendNote(
        response.ok
          ? (data.message ?? "If that email needs verification, we sent a new message.")
          : (data.error ?? "Unable to resend verification."),
      );
    } catch {
      setResendNote("Network error. Try again.");
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          rememberMe,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        logAuth("login_failed", email.trim() || "unknown", {
          reason: (data as { error?: string }).error ?? "invalid",
        });
        setError(
          (data as { error?: string }).error ??
            "Unable to sign in. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      logAuth("login", email.trim());
      window.location.href = destination;
    } catch {
      setError("Network error. Check your connection and try again.");
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      method="post"
      action="#"
      className="space-y-5"
      noValidate
    >
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
          {needsVerification ? (
            <button
              type="button"
              onClick={() => void resendVerification()}
              disabled={resending}
              className="mt-2 block font-semibold text-red-800 underline disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
          ) : null}
        </div>
      )}
      {resendNote ? (
        <p className="text-sm text-slate-600">{resendNote}</p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-600">
            Keep me signed in for 30 days
          </span>
        </label>
        <Link
          href="/forgot-password"
          className="shrink-0 text-sm font-medium text-violet-600 hover:text-violet-700"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 text-sm font-semibold text-white transition-colors hover:bg-violet-700",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Sign in
          </>
        )}
      </button>
    </form>
  );
}
