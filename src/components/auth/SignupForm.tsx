"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, MailCheck, UserPlus } from "lucide-react";
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
    } catch {
      setError("Network error. Check your connection and try again.");
      setIsLoading(false);
    }
  }

  if (submittedEmail) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-50">
          <MailCheck className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Check your email
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            If <span className="font-medium text-gray-700">{submittedEmail}</span>{" "}
            isn&apos;t already registered, we&apos;ve sent a verification link.
            Verify your email, then sign in to create your workspace.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-violet-600 hover:text-violet-700"
        >
          Back to sign in
        </Link>
      </div>
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
