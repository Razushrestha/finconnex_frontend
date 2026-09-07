"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function tokenFromLocation() {
  if (typeof window === "undefined") return "";
  const hash = window.location.hash.replace(/^#/, "");
  return (
    new URLSearchParams(hash).get("token")?.trim() ||
    new URLSearchParams(hash).get("invitationToken")?.trim() ||
    ""
  );
}

export function AcceptWorkspaceInviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken =
    searchParams.get("token")?.trim() ||
    searchParams.get("invitationToken")?.trim() ||
    "";
  const [token, setToken] = React.useState(queryToken);

  React.useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
      return;
    }
    const hashed = tokenFromLocation();
    if (hashed) {
      router.replace(`/invite/accept?token=${encodeURIComponent(hashed)}`);
    }
  }, [queryToken, router]);
  const [status, setStatus] = React.useState<"idle" | "working" | "ok" | "error">(
    token ? "working" : "idle",
  );
  const [message, setMessage] = React.useState<string | null>(null);
  const [signedIn, setSignedIn] = React.useState(false);
  const [workspaceName, setWorkspaceName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/workspace-invitation/accept", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          signedIn?: boolean;
          workspaceName?: string | null;
        };
        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          setMessage(data.error ?? "This invitation could not be accepted.");
          return;
        }
        setSignedIn(Boolean(data.signedIn));
        setWorkspaceName(data.workspaceName ?? null);
        setStatus("ok");
        setMessage(
          data.workspaceName
            ? `You joined ${data.workspaceName}.`
            : "Invitation accepted.",
        );
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Network error. Check your connection and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <p className="text-sm text-amber-700">
        Open the invitation link from your email. It should include a one-time
        token.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {status === "working" ? (
        <p className="inline-flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Accepting invitation…
        </p>
      ) : null}
      {message ? (
        <div
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
          href={signedIn ? "/" : "/login"}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700"
        >
          {signedIn ? "Open workspace" : "Sign in"}
        </Link>
      ) : null}
      {status === "ok" && workspaceName ? (
        <p className="text-center text-xs text-gray-400">{workspaceName}</p>
      ) : null}
    </div>
  );
}
