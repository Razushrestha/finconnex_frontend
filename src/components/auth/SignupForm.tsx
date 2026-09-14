"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
  setPendingVerificationEmail,
} from "@/lib/auth/pending-verification";
import { persistCrmTokens } from "@/lib/activity-timeline/auth";

export function SignupForm() {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(
    null,
  );
  const [otp, setOtp] = React.useState("");
  const [isVerified, setIsVerified] = React.useState(false);
  const [resendNote, setResendNote] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);
  const [resendCooldownUntil, setResendCooldownUntil] = React.useState(0);
  const [needsPasswordForLogin, setNeedsPasswordForLogin] = React.useState(false);
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const pending = getPendingVerificationEmail();
    if (pending) {
      setSubmittedEmail(pending);
      setNeedsPasswordForLogin(true);
    }
  }, []);

  React.useEffect(() => {
    if (Date.now() >= resendCooldownUntil) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [resendCooldownUntil]);

  const resendCooldownSeconds = Math.max(
    0,
    Math.ceil((resendCooldownUntil - Date.now()) / 1000),
  );

  function useDifferentEmail() {
    clearPendingVerificationEmail();
    setSubmittedEmail(null);
    setEmail("");
    setPassword("");
    setOtp("");
    setError(null);
    setResendNote(null);
    setIsVerified(false);
    setNeedsPasswordForLogin(false);
    setResendCooldownUntil(0);
  }

  async function resendSignupCode() {
    if (!submittedEmail || resendCooldownSeconds > 0) return;
    setResending(true);
    setResendNote(null);
    setError(null);
    try {
      const response = await fetch("/api/auth/resend-signup-otp", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          (data as { error?: string }).error ??
            "Unable to resend the code. Try again.",
        );
        if (response.status === 429) {
          setResendCooldownUntil(Date.now() + 60_000);
        }
      } else {
        setResendNote(
          (data as { message?: string }).message ??
            "Signup code requested. Check inbox/spam — CRM sends it, not local SendGrid.",
        );
        setResendCooldownUntil(Date.now() + 60_000);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
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
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          (data as { error?: string }).error ??
            "Unable to sign up. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      const trimmedEmail = email.trim();
      setPendingVerificationEmail(trimmedEmail);
      setSubmittedEmail(trimmedEmail);
      setIsLoading(false);
    } catch {
      setError("Network error. Check your connection and try again.");
      setIsLoading(false);
    }
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    setError(null);

    if (!otp.trim()) {
      setError("Enter your verification code.");
      return;
    }
    if (!password) {
      setError("Enter the password you used at signup so we can sign you in.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedEmail, otp: otp.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          (data as { error?: string }).error ??
            "Unable to verify. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      clearPendingVerificationEmail();

      // Same password is still in memory from signup — sign in immediately so
      // local matches Vercel (verified account → session cookies).
      if (password && submittedEmail) {
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: submittedEmail,
            password,
            rememberMe: true,
          }),
        });
        const loginData = await loginResponse.json().catch(() => ({}));
        if (loginResponse.ok) {
          const payload = loginData as {
            needsWorkspace?: boolean;
            isPlatformAdmin?: boolean;
            accessToken?: string | null;
            refreshToken?: string | null;
          };
          if (payload.accessToken) {
            persistCrmTokens({
              accessToken: payload.accessToken,
              refreshToken: payload.refreshToken,
            });
          }
          window.location.href = payload.isPlatformAdmin
            ? "/platform"
            : payload.needsWorkspace
              ? "/create-workspace"
              : "/";
          return;
        }
        setError(
          (loginData as { error?: string }).error ??
            "Account verified, but sign-in failed. Try signing in manually.",
        );
        setIsVerified(true);
        setIsLoading(false);
        return;
      }

      setIsVerified(true);
      setIsLoading(false);
    } catch {
      setError("Network error. Check your connection and try again.");
      setIsLoading(false);
    }
  }

  if (isVerified) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Account verified
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to create your workspace.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-violet-600 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  if (submittedEmail) {
    return (
      <form onSubmit={handleVerify} className="space-y-5" noValidate>
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-50">
            <ShieldCheck className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Enter your verification code
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Confirm the account for{" "}
              <span className="font-medium text-gray-700">{submittedEmail}</span>.
              The code is emailed by FinConnex CRM (not this local app) — check
              Spam/Promotions. If nothing arrives, use the same account that
              already works on Vercel, or ask backend to fix CRM mail workers.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        {resendNote ? (
          <p className="text-sm text-emerald-700">{resendNote}</p>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
            Verification code
          </label>
          <Input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter your code"
            className="text-center text-lg tracking-[0.5em]"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={isLoading}
            required
            autoFocus
          />
        </div>

        {needsPasswordForLogin ? (
          <div className="space-y-1.5">
            <label
              htmlFor="signup-password-confirm"
              className="block text-sm font-medium text-gray-700"
            >
              Password (to sign you in after verify)
            </label>
            <Input
              id="signup-password-confirm"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Same password you used to sign up"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        ) : null}

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
              Verifying...
            </>
          ) : (
            "Verify account"
          )}
        </button>

        <button
          type="button"
          onClick={() => void resendSignupCode()}
          disabled={resending || isLoading || resendCooldownSeconds > 0}
          className="block w-full text-center text-sm font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50"
        >
          {resending
            ? "Sending code…"
            : resendCooldownSeconds > 0
              ? `Resend available in ${resendCooldownSeconds}s`
              : "Resend signup code"}
        </button>

        <button
          type="button"
          onClick={useDifferentEmail}
          disabled={isLoading}
          className="block w-full text-center text-sm font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50"
        >
          Use a different email
        </button>

        <Link
          href="/login"
          className="block text-center text-sm font-medium text-violet-600 hover:text-violet-700"
        >
          Back to sign in
        </Link>
      </form>
    );
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
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700"
          >
            First name
          </label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="Jane"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-700"
          >
            Last name
          </label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
        />
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
            Creating account...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Create account
          </>
        )}
      </button>
    </form>
  );
}
