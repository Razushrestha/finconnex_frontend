"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import {
  DEFAULT_SMTP,
  loadSmtpConfig,
  saveSmtpConfig,
  type SmtpConfig,
} from "@/lib/comms/smtp";
import {
  getCrmSmtpTestStatus,
  queueCrmSmtpTest,
  smtpFromWorkspaceSettings,
  smtpToSettingsPatch,
  tryCrmSettings,
  patchCrmWorkspaceSettings,
} from "@/lib/settings/api";
import { useCrmSettings } from "@/lib/settings/use-crm-settings";
import { cn } from "@/lib/utils";

const TERMINAL = new Set(["completed", "failed", "success", "error"]);

/** Settings → Communication → SMTP (`GET/PATCH /v1/settings`, SMTP test jobs). */
export function SmtpSettingsClient() {
  const crm = useCrmSettings();
  const [cfg, setCfg] = useState<SmtpConfig>(() => loadSmtpConfig());
  const [password, setPassword] = useState("");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!crm.settings) return;
    const next = smtpFromWorkspaceSettings(crm.settings, loadSmtpConfig());
    setCfg(next);
    if (next.fromEmail && !recipient) setRecipient(next.fromEmail);
  }, [crm.settings]);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 4000);
  }

  async function save() {
    setCfg(saveSmtpConfig(cfg));
    if (crm.source === "api") {
      const patched = await tryCrmSettings(() =>
        patchCrmWorkspaceSettings(
          smtpToSettingsPatch(cfg, password || undefined, crm.settings?.revision),
        ),
      );
      if (patched) {
        crm.setSettings(patched);
        setPassword("");
        flash("SMTP settings saved to CRM");
        return;
      }
    }
    flash("SMTP settings saved");
  }

  async function testSend() {
    const to = recipient.trim() || cfg.fromEmail;
    if (!to) {
      flash("Enter a recipient email for the SMTP test");
      return;
    }
    setBusy(true);
    const queued = await tryCrmSettings(() => queueCrmSmtpTest(to));
    if (!queued) {
      setBusy(false);
      flash("Could not queue SMTP test — sign in with a workspace session");
      return;
    }
    const jobId = queued.jobId || queued.id;
    if (!jobId) {
      setBusy(false);
      flash(`Test ${queued.state}`);
      return;
    }
    flash(`Test queued (${jobId})`);
    for (let i = 0; i < 12; i += 1) {
      await new Promise((r) => window.setTimeout(r, 1500));
      const status = await tryCrmSettings(() => getCrmSmtpTestStatus(jobId));
      if (!status) break;
      const state = status.state.toLowerCase();
      if (TERMINAL.has(state)) {
        setBusy(false);
        if (status.error) flash(`Test ${state}: ${status.error}`);
        else if (status.result?.reachable === false) {
          flash(`SMTP unreachable (${status.result.host}:${status.result.port})`);
        } else {
          flash(`Test ${state}`);
        }
        return;
      }
    }
    setBusy(false);
    flash("Test still running — check again shortly");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">SMTP</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Workspace outbound email. Test queues POST /v1/settings/smtp-test.
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
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
        </div>
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">{message}</p>
        ) : null}
      </div>
      <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            className="rounded border-slate-300 text-violet-600"
          />
          Enable SMTP gateway
        </label>
        <Field label="Host">
          <input
            className={inputClass}
            value={cfg.host}
            onChange={(e) => setCfg({ ...cfg, host: e.target.value })}
          />
        </Field>
        <Field label="Port">
          <input
            type="number"
            className={inputClass}
            value={cfg.port}
            onChange={(e) =>
              setCfg({ ...cfg, port: Number(e.target.value) || 587 })
            }
          />
        </Field>
        <Field label="Username">
          <input
            className={inputClass}
            value={cfg.username}
            onChange={(e) => setCfg({ ...cfg, username: e.target.value })}
          />
        </Field>
        <Field label="Password / API key">
          <input
            type="password"
            className={inputClass}
            value={password}
            placeholder="Write-only — not returned by GET"
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="From name">
          <input
            className={inputClass}
            value={cfg.fromName}
            onChange={(e) => setCfg({ ...cfg, fromName: e.target.value })}
          />
        </Field>
        <Field label="From email">
          <input
            className={inputClass}
            value={cfg.fromEmail}
            onChange={(e) => setCfg({ ...cfg, fromEmail: e.target.value })}
          />
        </Field>
        <Field label="Test recipient" className="sm:col-span-2">
          <input
            className={inputClass}
            value={recipient}
            placeholder={cfg.fromEmail || "admin@example.com"}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-[12px] text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={cfg.useTls}
            onChange={(e) => setCfg({ ...cfg, useTls: e.target.checked })}
            className="rounded border-slate-300 text-violet-600"
          />
          Use TLS
        </label>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
        <button
          type="button"
          onClick={() => void save()}
          className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy || !cfg.enabled}
          onClick={() => void testSend()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 disabled:opacity-50"
        >
          <Mail className="h-3.5 w-3.5" />
          {busy ? "Testing…" : "Send test"}
        </button>
        <button
          type="button"
          onClick={() => setCfg({ ...DEFAULT_SMTP })}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600"
        >
          Reset defaults
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-violet-500";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}
