"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";
  const [status, setStatus] = React.useState<"idle" | "working" | "ok" | "error">(
    tokenFromUrl ? "working" : "idle",
  );
  const [message, setMessage] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    if (!tokenFromUrl) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/email-verification/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenFromUrl }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          setMessage(data.error ?? "This verification link is invalid or expired.");
          return;
        }
        setStatus("ok");
        setMessage(data.message ?? "Your email is verified.");
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Network error. Check your connection and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenFromUrl]);

  async function resend(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setMessage("Enter the email on your account.");
      return;
    }
    setResending(true);
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
      if (!response.ok) {
        setMessage(data.error ?? "Unable to resend verification.");
        return;
      }
      setMessage(
        data.message ??
          "If that email needs verification, we sent a new confirmation message.",
      );
    } catch {
      setMessage("Network error. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-5">
      {status === "working" ? (
        <p className="inline-flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verifying your email…
        </p>
      ) : null}
      {message ? (
        <div
          role="status"
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            status === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-slate-50 text-slate-700",
          )}
        >
          {message}
        </div>
      ) : null}
      {status === "ok" ? (
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Continue to sign in
        </Link>
      ) : (
        <form onSubmit={resend} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Resend verification email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={resending}
            />
          </div>
          <button
            type="submit"
            disabled={resending}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {resending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Resend verification"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
