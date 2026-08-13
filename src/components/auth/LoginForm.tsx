"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { logAuth } from "@/lib/rules";
import { DEMO_TOTP_CODE } from "@/lib/auth/two-factor";

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

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [step, setStep] = React.useState<"credentials" | "otp">("credentials");
  const [rememberMe, setRememberMe] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    setError(null);

    if (step === "otp") {
      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/verify-2fa", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: otp }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          logAuth("2fa_failed", username.trim() || "unknown", {
            reason: (data as { error?: string }).error ?? "invalid",
          });
          setError(
            (data as { error?: string }).error ??
              `Invalid code. Demo TOTP is ${DEMO_TOTP_CODE}`,
          );
          setIsLoading(false);
          return;
        }
        logAuth("2fa_success", username.trim());
        window.location.href = destination;
      } catch {
        setError("Network error. Check your connection and try again.");
        setIsLoading(false);
      }
      return;
    }

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          rememberMe,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        logAuth("login_failed", username.trim() || "unknown", {
          reason: (data as { error?: string }).error ?? "invalid",
        });
        setError(
          (data as { error?: string }).error ??
            "Unable to sign in. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      logAuth("login", username.trim());

      if ((data as { requires2fa?: boolean }).requires2fa) {
        setStep("otp");
        setIsLoading(false);
        return;
      }

      // Full page load so the session cookie is picked up by proxy + layouts
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
        </div>
      )}

      {step === "otp" ? (
        <div className="space-y-1.5">
          <label
            htmlFor="otp"
            className="block text-sm font-medium text-gray-700"
          >
            Authentication code
          </label>
          <Input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={DEMO_TOTP_CODE}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={isLoading}
            required
            autoFocus
          />
          <p className="text-xs text-gray-500">
            2FA is on — enter demo code {DEMO_TOTP_CODE} or a backup code.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
        </>
      )}

      {/* Native submit button: Base UI Button forces type="button" and breaks form submit */}
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
            {step === "otp" ? "Verifying..." : "Signing in..."}
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            {step === "otp" ? "Verify & continue" : "Sign in to workspace"}
          </>
        )}
      </button>
    </form>
  );
}
