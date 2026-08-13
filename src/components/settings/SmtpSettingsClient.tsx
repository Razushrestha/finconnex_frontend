"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import {
  DEFAULT_SMTP,
  loadSmtpConfig,
  saveSmtpConfig,
  type SmtpConfig,
} from "@/lib/comms/smtp";
import { sendEmailDemoLive } from "@/lib/comms/send-gateway";

/** Settings → Communication → SMTP */
export function SmtpSettingsClient() {
  const [cfg, setCfg] = useState<SmtpConfig>(() => loadSmtpConfig());
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2800);
  }

  function save() {
    setCfg(saveSmtpConfig(cfg));
    flash("SMTP settings saved");
  }

  async function testSend() {
    setBusy(true);
    const result = await sendEmailDemoLive({
      email: cfg.fromEmail,
      subject: "FinConnex SMTP test",
      body: `Test via ${cfg.host}:${cfg.port} as ${cfg.fromName}`,
    });
    setBusy(false);
    flash(result.ok ? `Test sent (${result.mode})` : result.message);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">SMTP</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Demo outbound email settings used by the send gateway (campaigns,
          invites, journey runs).
        </p>
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
        <Field label="From name">
          <input
            className={inputClass}
            value={cfg.fromName}
            onChange={(e) => setCfg({ ...cfg, fromName: e.target.value })}
          />
        </Field>
        <Field label="From email" className="sm:col-span-2">
          <input
            className={inputClass}
            value={cfg.fromEmail}
            onChange={(e) => setCfg({ ...cfg, fromEmail: e.target.value })}
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
          onClick={save}
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
          {busy ? "Sending…" : "Send test"}
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
