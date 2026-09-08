"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

      setSubmittedEmail(email.trim());
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
