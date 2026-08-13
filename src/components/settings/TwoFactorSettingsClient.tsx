"use client";

import { useState } from "react";
import { ShieldCheck, KeyRound } from "lucide-react";
import {
  DEMO_TOTP_CODE,
  disableTwoFactor,
  enableTwoFactor,
  loadTwoFactorConfig,
  regenerateBackupCodes,
  type TwoFactorConfig,
} from "@/lib/auth/two-factor";

/** Settings → Security → Two-Factor Authentication */
export function TwoFactorSettingsClient() {
  const [cfg, setCfg] = useState<TwoFactorConfig>(() => loadTwoFactorConfig());
  const [message, setMessage] = useState<string | null>(null);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2800);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">
          Two-factor authentication
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Demo TOTP for staff login. When enabled, sign-in asks for code{" "}
          <span className="font-semibold text-slate-700">{DEMO_TOTP_CODE}</span>{" "}
          after password.
        </p>
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">{message}</p>
        ) : null}
      </div>
      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-600" />
            <div>
              <p className="text-[13px] font-semibold text-slate-800">
                {cfg.enabled ? "2FA is on" : "2FA is off"}
              </p>
              <p className="text-[11px] text-slate-500">
                {cfg.enrolledAt
                  ? `Enrolled ${new Date(cfg.enrolledAt).toLocaleString("en-AU")}`
                  : "Not enrolled"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = cfg.enabled ? disableTwoFactor() : enableTwoFactor();
              setCfg(next);
              flash(next.enabled ? "2FA enabled" : "2FA disabled");
            }}
            className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700"
          >
            {cfg.enabled ? "Disable" : "Enable"}
          </button>
        </div>

        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3">
          <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Authenticator secret (demo)
          </p>
          <p className="mt-1 font-mono text-[13px] text-slate-800">
            {cfg.secretDemo}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            QR placeholder — use demo code {DEMO_TOTP_CODE} at login.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-slate-700">
              Backup codes
            </p>
            <button
              type="button"
              onClick={() => {
                setCfg(regenerateBackupCodes());
                flash("Backup codes regenerated");
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700"
            >
              <KeyRound className="h-3 w-3" />
              Regenerate
            </button>
          </div>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            {cfg.backupCodes.map((c) => (
              <li
                key={c}
                className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-[12px] text-slate-700"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
