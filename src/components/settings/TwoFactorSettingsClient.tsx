"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  confirmCrmTwoFactorSetup,
  disableCrmTwoFactor,
  startCrmTwoFactorSetup,
} from "@/lib/auth/two-factor-api";
import { patchCrmWorkspaceSettings } from "@/lib/settings/api";
import { useCrmSettings } from "@/lib/settings/use-crm-settings";
import {
  getCrmUserProfile,
  tryCrmUserProfile,
} from "@/lib/user-profile/api";
import { cn } from "@/lib/utils";

/** Settings → Security → Two-Factor Authentication */
export function TwoFactorSettingsClient() {
  const crm = useCrmSettings();
  const [enabled, setEnabled] = useState(false);
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [otpAuthUrl, setOtpAuthUrl] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [enforce, setEnforce] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (crm.security) setEnforce(crm.security.enforce2FA);
    else if (crm.settings) setEnforce(Boolean(crm.settings.enforce2FA));
  }, [crm.security, crm.settings]);

  useEffect(() => {
    void tryCrmUserProfile(() => getCrmUserProfile()).then((profile) => {
      if (!profile) return;
      setEnabled(Boolean(profile.twoFactorEnabled));
      setEnrolledAt(profile.twoFactorEnabledAt ?? null);
    });
  }, []);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2800);
  }

  async function onStart() {
    setBusy(true);
    try {
      const setup = await startCrmTwoFactorSetup();
      setSecret(setup.secret);
      setOtpAuthUrl(setup.otpAuthUrl);
      flash("Scan the secret in your authenticator, then confirm the code");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not start 2FA setup");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    setBusy(true);
    try {
      const codes = await confirmCrmTwoFactorSetup(code);
      setEnabled(true);
      setEnrolledAt(new Date().toISOString());
      setRecoveryCodes(codes);
      setCode("");
      flash("2FA enabled — store the recovery codes");
    } catch (err) {
      flash(err instanceof Error ? err.message : "That code was not accepted");
    } finally {
      setBusy(false);
    }
  }

  async function onDisable() {
    setBusy(true);
    try {
      await disableCrmTwoFactor();
      setEnabled(false);
      setEnrolledAt(null);
      setSecret("");
      setOtpAuthUrl("");
      setRecoveryCodes([]);
      flash("2FA disabled");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not disable 2FA");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">
          Two-factor authentication
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Personal TOTP uses POST /v1/security/two-factor. Workspace policy uses
          PATCH /v1/settings enforce2FA.
        </p>
        <span
          className={cn(
            "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
            crm.source === "api"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {crm.source === "api"
            ? "Live CRM"
            : crm.loading
              ? "Connecting…"
              : "Demo"}
        </span>
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
                {enabled ? "2FA is on" : "2FA is off"}
              </p>
              <p className="text-[11px] text-slate-500">
                {enrolledAt
                  ? `Enrolled ${new Date(enrolledAt).toLocaleString("en-AU")}`
                  : "Not enrolled"}
              </p>
            </div>
          </div>
          {enabled ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onDisable()}
              className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              Disable
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onStart()}
              className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              Enable
            </button>
          )}
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold text-slate-800">
              Enforce 2FA for all members
            </p>
            <p className="text-[11px] text-slate-500">
              PATCH /v1/settings · enforce2FA
            </p>
          </div>
          <input
            type="checkbox"
            checked={enforce}
            onChange={(e) => {
              const next = e.target.checked;
              setEnforce(next);
              void patchCrmWorkspaceSettings({
                enforce2FA: next,
                expectedRevision: crm.settings?.revision,
              })
                .then((patched) => {
                  crm.setSettings(patched);
                  crm.setSecurity(
                    crm.security
                      ? { ...crm.security, enforce2FA: next }
                      : {
                          passwordMinLength: patched.passwordMinLength ?? 8,
                          enforce2FA: next,
                          ipAllowlist: patched.ipAllowlist ?? [],
                          sessionTimeoutMinutes:
                            patched.sessionTimeoutMinutes ?? 480,
                        },
                  );
                  flash(next ? "Workspace 2FA enforced" : "Workspace 2FA optional");
                })
                .catch((err: unknown) => {
                  setEnforce(!next);
                  flash(
                    err instanceof Error
                      ? err.message
                      : "Could not update 2FA policy",
                  );
                });
            }}
            className="h-4 w-4 rounded border-slate-300 text-violet-600"
          />
        </label>

        {!enabled && (secret || otpAuthUrl) ? (
          <div className="space-y-2 rounded-xl border border-dashed border-slate-200 px-4 py-3">
            <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Authenticator secret
            </p>
            {secret ? (
              <p className="font-mono text-[13px] text-slate-800">{secret}</p>
            ) : null}
            {otpAuthUrl ? (
              <p className="break-all text-[11px] text-slate-500">{otpAuthUrl}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                className="h-9 w-36 rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-violet-400"
              />
              <button
                type="button"
                disabled={busy || code.trim().length < 6}
                onClick={() => void onConfirm()}
                className="h-9 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        ) : null}

        {recoveryCodes.length ? (
          <div>
            <p className="mb-2 text-[12px] font-semibold text-slate-700">
              Recovery codes (shown once)
            </p>
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-3">
              {recoveryCodes.map((c) => (
                <li
                  key={c}
                  className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-[12px] text-slate-700"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
