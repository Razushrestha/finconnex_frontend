"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";

import { CalendarSyncSettingsClient } from "@/components/settings/CalendarSyncSettingsClient";
import { getCrmApiBaseUrl } from "@/lib/activity-timeline/auth";
import {
  connectEquifax,
  connectStripe,
  createIntegrationConnection,
  createWebhookEndpoint,
  disconnectEquifax,
  disconnectIntegrationConnection,
  disconnectStripe,
  listWebhookEndpoints,
  removeMessagingCredential,
  saveMessagingCredential,
  setWebhookEndpointActive,
  verifyMessagingCredential,
  type EquifaxConnection,
  type IntegrationConnection,
  type MessagingCredential,
  type StripeConnection,
  type WebhookEndpoint,
} from "@/lib/integrations/api";
import {
  oauthConnectionLabel,
  type IntegrationDefinition,
  type OAuthPreset,
} from "@/lib/integrations/catalog";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------- pieces */

const input =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[var(--brand-primary)]";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      {children}
      {hint ? (
        <span className="block text-[11px] text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

function PrimaryButton({
  busy,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--brand-primary-strong)] disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function SecondaryButton({
  busy,
  danger,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-[13px] font-semibold disabled:opacity-50",
        danger
          ? "border-rose-200 text-rose-600 hover:bg-rose-50"
          : "border-slate-200 text-slate-700 hover:bg-slate-50",
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-[12px] text-slate-700">
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--brand-primary)]"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Status({ connected, text }: { connected: boolean; text?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2 text-[12px] font-medium",
        connected
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-50 text-slate-600",
      )}
    >
      {text ?? (connected ? "Connected" : "Not connected")}
    </div>
  );
}

function ErrorText({ error }: { error: string }) {
  return error ? <p className="text-[12px] text-rose-600">{error}</p> : null;
}

function message(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

function useAction(onDone: () => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function run(
    key: string,
    work: () => Promise<unknown>,
    fallback: string,
  ) {
    setBusy(key);
    setError("");
    try {
      await work();
      onDone();
    } catch (err) {
      setError(message(err, fallback));
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, run };
}

function apiBase() {
  return (getCrmApiBaseUrl() ?? "").replace(/\/$/, "");
}

/* --------------------------------------------------------------- Stripe */

export function StripePanel({
  status,
  onChanged,
}: {
  status: StripeConnection | null;
  onChanged: () => void;
}) {
  const [form, setForm] = useState({
    label: "",
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
  });
  const { busy, error, run } = useAction(onChanged);
  const webhookUrl = `${apiBase()}/v1/webhooks/stripe`;

  if (status?.connected) {
    return (
      <div className="space-y-4">
        <Status
          connected
          text={`Connected${status.label ? ` · ${status.label}` : ""}`}
        />
        <p className="text-[12px] text-slate-600">
          Publishable key <code>{status.publishableKey || "—"}</code>
          <br />
          Webhook signing secret{" "}
          {status.hasWebhookSecret
            ? "saved"
            : "not set — payments won't be marked paid automatically"}
        </p>
        <CopyBox label="Webhook endpoint for Stripe" value={webhookUrl} />
        <SecondaryButton
          danger
          busy={busy === "disconnect"}
          onClick={() =>
            void run(
              "disconnect",
              disconnectStripe,
              "Could not disconnect Stripe.",
            )
          }
        >
          Disconnect Stripe
        </SecondaryButton>
        <ErrorText error={error} />
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          "connect",
          () =>
            connectStripe({
              label: form.label.trim() || undefined,
              publishableKey: form.publishableKey.trim(),
              secretKey: form.secretKey.trim(),
              webhookSecret: form.webhookSecret.trim() || undefined,
            }),
          "Stripe did not accept these keys.",
        );
      }}
    >
      <p className="text-[12px] text-slate-600">
        In the Stripe Dashboard open <b>Developers → API keys</b> and copy both
        keys. Then add a webhook endpoint pointing at the address below (events:{" "}
        <code>payment_intent.succeeded</code> and{" "}
        <code>payment_intent.payment_failed</code>) and paste its signing
        secret, so paid invoices are recorded automatically.
      </p>
      <CopyBox label="Webhook endpoint for Stripe" value={webhookUrl} />
      <Field label="Label (optional)">
        <input
          className={input}
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="Main account"
        />
      </Field>
      <Field label="Publishable key">
        <input
          className={input}
          required
          value={form.publishableKey}
          onChange={(e) => setForm({ ...form, publishableKey: e.target.value })}
          placeholder="pk_live_…"
        />
      </Field>
      <Field label="Secret key" hint="Stored encrypted; never shown again.">
        <input
          className={input}
          required
          type="password"
          autoComplete="off"
          value={form.secretKey}
          onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
          placeholder="sk_live_…"
        />
      </Field>
      <Field label="Webhook signing secret (recommended)">
        <input
          className={input}
          type="password"
          autoComplete="off"
          value={form.webhookSecret}
          onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
          placeholder="whsec_…"
        />
      </Field>
      <PrimaryButton type="submit" busy={busy === "connect"}>
        Connect Stripe
      </PrimaryButton>
      <ErrorText error={error} />
    </form>
  );
}

/* -------------------------------------------------------------- Equifax */

export function EquifaxPanel({
  status,
  onChanged,
}: {
  status: EquifaxConnection | null;
  onChanged: () => void;
}) {
  const [form, setForm] = useState({
    clientId: "",
    clientSecret: "",
    tokenEndpoint: "",
    scopes: "",
  });
  const { busy, error, run } = useAction(onChanged);

  if (status?.connected) {
    return (
      <div className="space-y-4">
        <Status
          connected
          text={`Connected · client ${status.clientId || "—"}`}
        />
        {status.lastError ? (
          <p className="text-[12px] text-rose-600">
            Last error: {status.lastError}
          </p>
        ) : null}
        <SecondaryButton
          danger
          busy={busy === "disconnect"}
          onClick={() =>
            void run(
              "disconnect",
              disconnectEquifax,
              "Could not disconnect Equifax.",
            )
          }
        >
          Disconnect Equifax
        </SecondaryButton>
        <ErrorText error={error} />
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          "connect",
          () =>
            connectEquifax({
              clientId: form.clientId.trim(),
              clientSecret: form.clientSecret.trim(),
              tokenEndpoint: form.tokenEndpoint.trim() || undefined,
              scopes: form.scopes.split(/[\s,]+/).filter(Boolean),
            }),
          "Equifax did not accept these credentials.",
        );
      }}
    >
      <p className="text-[12px] text-slate-600">
        Use the API client credentials Equifax issued to your business (Equifax
        developer portal → your app). FinConnex requests and refreshes access
        tokens itself.
      </p>
      <Field label="Client ID">
        <input
          className={input}
          required
          value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value })}
        />
      </Field>
      <Field label="Client secret" hint="Stored encrypted; never shown again.">
        <input
          className={input}
          required
          type="password"
          autoComplete="off"
          value={form.clientSecret}
          onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
        />
      </Field>
      <Field
        label="Token endpoint (optional)"
        hint="Leave blank for Equifax's default."
      >
        <input
          className={input}
          value={form.tokenEndpoint}
          onChange={(e) => setForm({ ...form, tokenEndpoint: e.target.value })}
          placeholder="https://api.equifax.com.au/v1/oauth/token"
        />
      </Field>
      <Field label="Scopes (optional)">
        <input
          className={input}
          value={form.scopes}
          onChange={(e) => setForm({ ...form, scopes: e.target.value })}
          placeholder="Separate with spaces"
        />
      </Field>
      <PrimaryButton type="submit" busy={busy === "connect"}>
        Connect Equifax
      </PrimaryButton>
      <ErrorText error={error} />
    </form>
  );
}

/* ---------------------------------------------------- SendGrid / Twilio */

export function MessagingPanel({
  provider,
  whatsapp,
  credential,
  onChanged,
}: {
  provider: "SENDGRID" | "TWILIO";
  whatsapp?: boolean;
  credential: MessagingCredential | null;
  onChanged: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const { busy, error, run } = useAction(onChanged);
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });
  const saved =
    !!credential &&
    (provider === "SENDGRID" ? credential.hasApiKey : credential.hasAuthToken);
  const keep = saved ? "Leave blank to keep the saved one." : undefined;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          "save",
          () => saveMessagingCredential(provider, form),
          "These details were not accepted.",
        );
      }}
    >
      <Status
        connected={saved && credential?.status !== "INVALID"}
        text={
          saved
            ? `Saved · ${credential?.status?.toLowerCase().replace(/_/g, " ") || "saved"}`
            : "Using FinConnex's shared sender"
        }
      />
      {credential?.lastError ? (
        <p className="text-[12px] text-rose-600">
          Last error: {credential.lastError}
        </p>
      ) : null}
      {provider === "SENDGRID" ? (
        <>
          <p className="text-[12px] text-slate-600">
            Workspace email goes out through your SendGrid account. Create an
            API key with <b>Mail Send</b> access, and verify the sender address
            in SendGrid first.
          </p>
          <Field label="API key" hint={keep}>
            <input
              className={input}
              type="password"
              autoComplete="off"
              placeholder="SG.…"
              onChange={set("apiKey")}
            />
          </Field>
          <Field label="From email">
            <input
              className={input}
              type="email"
              defaultValue={credential?.fromEmail}
              placeholder="hello@yourcompany.com"
              onChange={set("fromEmail")}
            />
          </Field>
          <Field label="From name">
            <input
              className={input}
              defaultValue={credential?.fromName}
              placeholder="Your company"
              onChange={set("fromName")}
            />
          </Field>
        </>
      ) : (
        <>
          <p className="text-[12px] text-slate-600">
            {whatsapp
              ? "WhatsApp messages go out through your Twilio account's approved WhatsApp sender."
              : "Texts and calls use your Twilio account and number."}{" "}
            Find the Account SID and Auth Token on the Twilio Console home page.
          </p>
          <Field label="Account SID">
            <input
              className={input}
              defaultValue={credential?.accountSid}
              placeholder="AC…"
              onChange={set("accountSid")}
            />
          </Field>
          <Field label="Auth token" hint={keep}>
            <input
              className={input}
              type="password"
              autoComplete="off"
              onChange={set("authToken")}
            />
          </Field>
          {whatsapp ? (
            <Field label="WhatsApp sender">
              <input
                className={input}
                defaultValue={credential?.whatsappFrom}
                placeholder="whatsapp:+61400000000"
                onChange={set("whatsappFrom")}
              />
            </Field>
          ) : (
            <Field label="Phone number" hint="E.164 format, e.g. +61400000000">
              <input
                className={input}
                defaultValue={credential?.phoneNumber}
                placeholder="+61400000000"
                onChange={set("phoneNumber")}
              />
            </Field>
          )}
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <PrimaryButton type="submit" busy={busy === "save"}>
          Save
        </PrimaryButton>
        {saved ? (
          <>
            <SecondaryButton
              type="button"
              busy={busy === "verify"}
              onClick={() =>
                void run(
                  "verify",
                  () => verifyMessagingCredential(provider),
                  "Verification failed.",
                )
              }
            >
              Test connection
            </SecondaryButton>
            <SecondaryButton
              type="button"
              danger
              busy={busy === "remove"}
              onClick={() =>
                void run(
                  "remove",
                  () => removeMessagingCredential(provider),
                  "Could not remove these details.",
                )
              }
            >
              Remove
            </SecondaryButton>
          </>
        ) : null}
      </div>
      <ErrorText error={error} />
    </form>
  );
}

/* -------------------------------------------------------------- Webhooks */

export function WebhookPanel({
  integration,
}: {
  integration: IntegrationDefinition;
}) {
  const automation = integration.id === "zapier" || integration.id === "make";
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[] | null>(null);
  const [created, setCreated] = useState<{
    url: string;
    secret: string;
    signed: boolean;
  } | null>(null);
  const [signed, setSigned] = useState(!automation);
  const [reload, setReload] = useState(0);
  const { busy, error, run } = useAction(() => setReload((n) => n + 1));
  const base = `${apiBase()}/public/integrations/webhooks/`;

  useEffect(() => {
    let alive = true;
    listWebhookEndpoints()
      .then((rows) => alive && setEndpoints(rows))
      .catch(() => alive && setEndpoints([]));
    return () => {
      alive = false;
    };
  }, [reload]);

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-slate-600">
        {integration.id === "zapier"
          ? "In a Zap, add the action “Webhooks by Zapier → POST” and paste the URL below."
          : integration.id === "make"
            ? "In a Make scenario, add an “HTTP → Make a request” module (POST, JSON) with the URL below."
            : "Any system can POST JSON events to this URL."}{" "}
        Each URL can be paused at any time.
      </p>
      <label className="flex items-start gap-2 text-[12px] text-slate-700">
        <input
          type="checkbox"
          checked={signed}
          onChange={(e) => setSigned(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Require a signature (HMAC-SHA256 of the body in the{" "}
          <code>x-webhook-signature</code> header).
          {automation
            ? " Zapier and Make usually can't sign requests — leave this off and keep the URL private."
            : ""}
        </span>
      </label>
      <PrimaryButton
        busy={busy === "create"}
        onClick={() =>
          void run(
            "create",
            async () => {
              const result = await createWebhookEndpoint(
                signed ? "HMAC_SHA256" : "NONE",
              );
              setCreated({
                url: base + result.endpoint.slug,
                secret: result.signingSecret,
                signed,
              });
            },
            "Could not create a webhook URL.",
          )
        }
      >
        Create webhook URL
      </PrimaryButton>
      {created ? (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <CopyBox label="Webhook URL" value={created.url} />
          {created.signed && created.secret ? (
            <>
              <CopyBox label="Signing secret" value={created.secret} />
              <p className="text-[11px] text-amber-700">
                Copy the secret now — it is shown only once.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-slate-700">
          Your webhook URLs
        </p>
        {endpoints === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : endpoints.length === 0 ? (
          <p className="text-[12px] text-slate-400">None yet.</p>
        ) : (
          endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
            >
              <code className="min-w-0 flex-1 truncate text-[11px] text-slate-600">
                {base + endpoint.slug}
              </code>
              <button
                type="button"
                onClick={() =>
                  void run(
                    `toggle-${endpoint.id}`,
                    () =>
                      setWebhookEndpointActive(endpoint.id, !endpoint.isActive),
                    "Could not update this URL.",
                  )
                }
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  endpoint.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {busy === `toggle-${endpoint.id}`
                  ? "…"
                  : endpoint.isActive
                    ? "Active"
                    : "Paused"}
              </button>
            </div>
          ))
        )}
      </div>
      <ErrorText error={error} />
    </div>
  );
}

/* ------------------------------------------------------- OAuth2 apps */

export function OAuthPanel({
  integration,
  preset,
  connection,
  onChanged,
}: {
  integration: IntegrationDefinition;
  preset: OAuthPreset | null;
  connection: IntegrationConnection | null;
  onChanged: () => void;
}) {
  const [form, setForm] = useState({
    label: preset ? oauthConnectionLabel(integration) : "",
    tokenEndpoint: preset?.tokenEndpoint ?? "",
    scopes: preset?.scopes.join(" ") ?? "",
    clientId: "",
    clientSecret: "",
    refreshToken: "",
  });
  const { busy, error, run } = useAction(onChanged);

  if (connection && connection.status !== "DISCONNECTED") {
    return (
      <div className="space-y-4">
        <Status
          connected={connection.status === "CONNECTED"}
          text={`${connection.status === "CONNECTED" ? "Connected" : connection.status.toLowerCase()} · ${connection.label}`}
        />
        {connection.lastError ? (
          <p className="text-[12px] text-rose-600">
            Last error: {connection.lastError}
          </p>
        ) : null}
        <p className="text-[12px] text-slate-600">
          FinConnex keeps this connection&apos;s access token refreshed.
          Features that work with {integration.name} use this connection.
        </p>
        <SecondaryButton
          danger
          busy={busy === "disconnect"}
          onClick={() =>
            void run(
              "disconnect",
              () => disconnectIntegrationConnection(connection.id),
              "Could not disconnect.",
            )
          }
        >
          Disconnect {integration.name}
        </SecondaryButton>
        <ErrorText error={error} />
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          "connect",
          () =>
            createIntegrationConnection({
              label: form.label.trim() || integration.name,
              tokenEndpoint: form.tokenEndpoint.trim(),
              clientId: form.clientId.trim(),
              clientSecret: form.clientSecret.trim(),
              refreshToken: form.refreshToken.trim(),
              scopes: form.scopes.split(/[\s,]+/).filter(Boolean),
            }),
          `${integration.name} did not accept these credentials.`,
        );
      }}
    >
      <ol className="list-decimal space-y-1 pl-4 text-[12px] text-slate-600">
        <li>
          Register an OAuth app for your business
          {preset ? (
            <>
              {" "}
              in{" "}
              <a
                href={preset.developerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--brand-primary)] underline"
              >
                {integration.name}&apos;s developer console
              </a>
            </>
          ) : null}
          .
        </li>
        <li>Authorise it for your account to get a refresh token.</li>
        <li>Paste the app&apos;s credentials and the refresh token below.</li>
      </ol>
      {preset ? null : (
        <Field label="Name">
          <input
            className={input}
            required
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. Loan aggregator"
          />
        </Field>
      )}
      <Field label="Client ID">
        <input
          className={input}
          required
          value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value })}
        />
      </Field>
      <Field label="Client secret" hint="Stored encrypted; never shown again.">
        <input
          className={input}
          required
          type="password"
          autoComplete="off"
          value={form.clientSecret}
          onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
        />
      </Field>
      <Field label="Refresh token">
        <input
          className={input}
          required
          type="password"
          autoComplete="off"
          value={form.refreshToken}
          onChange={(e) => setForm({ ...form, refreshToken: e.target.value })}
        />
      </Field>
      <Field label="Token endpoint">
        <input
          className={input}
          required
          value={form.tokenEndpoint}
          onChange={(e) => setForm({ ...form, tokenEndpoint: e.target.value })}
          placeholder="https://…/oauth2/token"
        />
      </Field>
      <Field label="Scopes" hint="Separate with spaces.">
        <input
          className={input}
          value={form.scopes}
          onChange={(e) => setForm({ ...form, scopes: e.target.value })}
        />
      </Field>
      <PrimaryButton type="submit" busy={busy === "connect"}>
        Connect {integration.name}
      </PrimaryButton>
      <ErrorText error={error} />
    </form>
  );
}

/* ------------------------------------------------------- the rest */

export function CalendarPanel({
  provider,
}: {
  provider: "google" | "outlook";
}) {
  return <CalendarSyncSettingsClient provider={provider} />;
}

export function LinkPanel({
  href,
  cta,
  blurb,
}: {
  href: string;
  cta: string;
  blurb: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-slate-600">{blurb}</p>
      <Link
        href={href}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--brand-primary-strong)]"
      >
        {cta} <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );
}
