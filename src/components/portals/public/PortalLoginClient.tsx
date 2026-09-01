"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getPortalBySlug,
  getPortalSession,
  setPortalSession,
  type ClientPortal,
} from "@/lib/portals/types";
import {
  portalContactHints,
  sendPortalAccessCode,
  verifyPortalAccessCode,
} from "@/lib/portals/auth";
import {
  hasPortalConsent,
  incrementPortalLoginCount,
  recordPortalConsent,
} from "@/lib/portals/mortgage";
import { recordPortalLogin } from "@/components/portals/public/PortalShell";
import { PortalBrand } from "@/components/portals/public/mortgage/PortalBrand";
import { cn } from "@/lib/utils";

export function PortalLoginClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [portal, setPortal] = useState<ClientPortal | null>(null);
  const [ready, setReady] = useState(false);
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [firstVisit, setFirstVisit] = useState(true);
  const [error, setError] = useState("");
  const [hints, setHints] = useState({ maskedEmail: "", maskedPhone: "" });

  useEffect(() => {
    const p = getPortalBySlug(slug) ?? null;
    setPortal(p);
    setReady(true);
    if (!p || p.status !== "Active") return;
    setHints(portalContactHints(p));
    const consented = hasPortalConsent(slug, p);
    setFirstVisit(!consented);
    if (getPortalSession(slug) && consented) {
      router.replace(`/p/${slug}`);
    }
  }, [slug, router]);

  async function sendCode(nextChannel: "email" | "sms") {
    setChannel(nextChannel);
    setError("");
    const result = await sendPortalAccessCode(slug, nextChannel);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSentTo(result.destination);
    setDemoCode(result.code);
    setCode("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!portal || portal.status !== "Active") return;
    const result = verifyPortalAccessCode(slug, code);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (firstVisit && !accepted) {
      setError("Please accept the Privacy Policy and Terms and Conditions to continue.");
      return;
    }
    if (firstVisit) {
      recordPortalConsent(slug, result.portal);
    }
    incrementPortalLoginCount(slug, result.portal);
    setPortalSession(slug, result.portal.primaryContactEmail);
    recordPortalLogin(slug, result.portal.primaryContactEmail);
    router.push(`/p/${slug}`);
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F7F6F9] text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F7F6F9] px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Portal not found</h1>
      </div>
    );
  }

  if (portal.status !== "Active") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F7F6F9] px-4 text-center">
        <p className="text-[11px] font-semibold tracking-widest text-[#5A32A3] uppercase">
          FinConnex
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{portal.name}</h1>
        <p className="mt-3 text-sm text-slate-600">
          This portal is <strong>{portal.status}</strong> and cannot be accessed.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#F7F6F9] px-4">
      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mb-5 flex justify-center">
            <PortalBrand />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900">
            Sign in
          </h1>
          <p className="mt-2 text-[13px] text-slate-500">
            Welcome back. We’ll send a one-time code to the email or mobile we
            already have on file for your home loan.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-100/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
        >
          <p className="text-[12px] font-semibold text-slate-700">Send a code to</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => sendCode("email")}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left",
                channel === "email" && sentTo
                  ? "border-[#5A32A3] bg-violet-50"
                  : "border-slate-200 hover:bg-slate-50",
              )}
            >
              <div className="text-[11px] font-bold text-slate-800">Email</div>
              <div className="truncate text-[11px] text-slate-500">{hints.maskedEmail}</div>
            </button>
            <button
              type="button"
              onClick={() => sendCode("sms")}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left",
                channel === "sms" && sentTo
                  ? "border-[#5A32A3] bg-violet-50"
                  : "border-slate-200 hover:bg-slate-50",
              )}
            >
              <div className="text-[11px] font-bold text-slate-800">Mobile</div>
              <div className="truncate text-[11px] text-slate-500">{hints.maskedPhone}</div>
            </button>
          </div>

          {sentTo ? (
            <p className="mt-2 text-[11px] text-slate-500">
              Code sent to <span className="font-semibold text-slate-700">{sentTo}</span>
              {demoCode ? (
                <span className="ml-1 text-[#5A32A3]">
                  · Demo code {demoCode}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-slate-400">
              Choose email or mobile to receive your 6-digit code.
            </p>
          )}

          <label className="mt-4 mb-1.5 block text-[12px] font-semibold text-slate-700">
            Sign-in code
          </label>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            placeholder="6-digit code"
            className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-center text-[18px] tracking-[0.35em] outline-none focus:border-[#5A32A3] focus:shadow-[0_0_0_3px_rgba(90,50,163,0.12)]"
          />

          {firstVisit ? (
            <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-[#F7F6F9] px-3 py-2.5">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => {
                  setAccepted(e.target.checked);
                  setError("");
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#5A32A3]"
              />
              <span className="text-[12px] leading-snug text-slate-600">
                I accept the{" "}
                <Link
                  href={`/p/${slug}/privacy`}
                  className="font-semibold text-[#5A32A3] underline"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  href={`/p/${slug}/terms`}
                  className="font-semibold text-[#5A32A3] underline"
                >
                  Terms and Conditions
                </Link>
                . Required the first time you sign in.
              </span>
            </label>
          ) : null}

          {error ? (
            <p className="mt-2 text-[11px] font-medium text-rose-500">{error}</p>
          ) : null}

          <button
            type="submit"
            className="mt-4 h-11 w-full rounded-xl bg-[#5A32A3] text-[13px] font-semibold text-white shadow-lg shadow-[#5A32A3]/25 hover:bg-[#4a2888]"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
