/**
 * The workspace's third-party connections, as the CRM exposes them:
 *
 * - Stripe        — /v1/payments/stripe/connection     (API keys)
 * - Equifax       — /v1/equifax/connection             (OAuth client credentials)
 * - SendGrid /
 *   Twilio        — /v1/messaging-credentials/:provider (API keys)
 * - OAuth2 apps   — /v1/integrations/connections       (generic framework)
 * - Webhooks      — /v1/integrations/webhook-endpoints (inbound URLs)
 *
 * Calendar sync keeps its own client in
 * lib/booking/calendly-integration-api.
 */

import {
  ensureCrmSession,
  isBoundCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch, unwrapCrmData } from "@/lib/crm/request";

async function call<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  };
  const scoped = await ensureCrmSession();
  const json =
    scoped && isBoundCrmSession()
      ? await (async (session: CrmSession) => crmFetch(session, path, init))(
          scoped,
        )
      : await crmBffFetch(path, init);
  return unwrapCrmData<T>(json);
}

const rec = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const str = (value: unknown) => (typeof value === "string" ? value : "");
const list = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.map(rec);
  const r = rec(value);
  for (const key of ["items", "data", "results", "records"]) {
    if (Array.isArray(r[key])) return (r[key] as unknown[]).map(rec);
  }
  return [];
};

/* ---------------------------------------------------------------- Stripe */

export type StripeConnection = {
  connected: boolean;
  label: string;
  publishableKey: string;
  hasWebhookSecret: boolean;
  status: string;
};

export async function getStripeConnection(): Promise<StripeConnection> {
  const r = rec(await call("/v1/payments/stripe/connection"));
  return {
    connected: r.connected === true,
    label: str(r.label),
    publishableKey: str(r.publishableKey),
    hasWebhookSecret: r.hasWebhookSecret === true,
    status: str(r.status),
  };
}

export function connectStripe(input: {
  label?: string;
  publishableKey: string;
  secretKey: string;
  webhookSecret?: string;
}) {
  return call("/v1/payments/stripe/connection", "POST", input);
}

export function disconnectStripe() {
  return call("/v1/payments/stripe/connection", "DELETE");
}

/* --------------------------------------------------------------- Equifax */

export type EquifaxConnection = {
  connected: boolean;
  label: string;
  clientId: string;
  status: string;
  lastError: string;
};

export async function getEquifaxConnection(): Promise<EquifaxConnection> {
  const r = rec(await call("/v1/equifax/connection"));
  return {
    connected:
      r.connected === true || (!!r.id && str(r.status) === "CONNECTED"),
    label: str(r.label),
    clientId: str(r.clientId),
    status: str(r.status),
    lastError: str(r.lastError),
  };
}

export function connectEquifax(input: {
  label?: string;
  clientId: string;
  clientSecret: string;
  tokenEndpoint?: string;
  scopes?: string[];
}) {
  return call("/v1/equifax/connection", "POST", input);
}

export function disconnectEquifax() {
  return call("/v1/equifax/connection", "DELETE");
}

/* ------------------------------------------------------ SendGrid / Twilio */

export type MessagingProvider = "SENDGRID" | "TWILIO";

export type MessagingCredential = {
  provider: MessagingProvider;
  status: string;
  hasApiKey: boolean;
  hasAuthToken: boolean;
  accountSid: string;
  fromEmail: string;
  fromName: string;
  phoneNumber: string;
  whatsappFrom: string;
  lastError: string;
};

export async function listMessagingCredentials(): Promise<
  MessagingCredential[]
> {
  return list(await call("/v1/messaging-credentials")).map((r) => ({
    provider: str(r.provider) as MessagingProvider,
    status: str(r.status),
    hasApiKey: r.hasApiKey === true,
    hasAuthToken: r.hasAuthToken === true,
    accountSid: str(r.accountSid),
    fromEmail: str(r.fromEmail),
    fromName: str(r.fromName),
    phoneNumber: str(r.phoneNumber),
    whatsappFrom: str(r.whatsappFrom),
    lastError: str(r.lastError),
  }));
}

export function saveMessagingCredential(
  provider: MessagingProvider,
  input: Record<string, string | undefined>,
) {
  // Blank fields are left out so the CRM keeps what it already stores.
  const body = Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) => value != null && value.trim() !== "",
    ),
  );
  return call(`/v1/messaging-credentials/${provider}`, "PUT", body);
}

export function verifyMessagingCredential(provider: MessagingProvider) {
  return call(`/v1/messaging-credentials/${provider}/verify`, "POST");
}

export function removeMessagingCredential(provider: MessagingProvider) {
  return call(`/v1/messaging-credentials/${provider}`, "DELETE");
}

/* ----------------------------------------------- OAuth2 app connections */

export type IntegrationConnection = {
  id: string;
  provider: string;
  label: string;
  status: string;
  lastError: string;
};

export async function listIntegrationConnections(): Promise<
  IntegrationConnection[]
> {
  return list(await call("/v1/integrations/connections")).map((r) => ({
    id: str(r.id),
    provider: str(r.provider),
    label: str(r.label),
    status: str(r.status),
    lastError: str(r.lastError),
  }));
}

export function createIntegrationConnection(input: {
  label: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
  scopes?: string[];
}) {
  return call("/v1/integrations/connections", "POST", {
    provider: "GENERIC",
    ...input,
  });
}

export function disconnectIntegrationConnection(id: string) {
  return call(
    `/v1/integrations/connections/${encodeURIComponent(id)}/disconnect`,
    "POST",
  );
}

/* ------------------------------------------------------ Inbound webhooks */

export type WebhookEndpoint = {
  id: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
};

export async function listWebhookEndpoints(): Promise<WebhookEndpoint[]> {
  return list(await call("/v1/integrations/webhook-endpoints")).map((r) => ({
    id: str(r.id),
    slug: str(r.slug),
    isActive: r.isActive !== false,
    createdAt: str(r.createdAt),
  }));
}

/**
 * Creates an endpoint; the signing secret is returned only this once.
 * "HMAC_SHA256": senders sign each body with the secret (header
 * x-webhook-signature). "NONE": the URL itself is the secret — for tools such
 * as Zapier and Make that cannot sign requests.
 */
export async function createWebhookEndpoint(
  verificationStrategy: "HMAC_SHA256" | "NONE" = "HMAC_SHA256",
): Promise<{
  endpoint: WebhookEndpoint;
  signingSecret: string;
}> {
  const r = rec(
    await call("/v1/integrations/webhook-endpoints", "POST", {
      provider: "GENERIC",
      verificationStrategy,
    }),
  );
  const e = rec(r.endpoint);
  return {
    endpoint: {
      id: str(e.id),
      slug: str(e.slug),
      isActive: e.isActive !== false,
      createdAt: str(e.createdAt),
    },
    signingSecret: str(r.signingSecret),
  };
}

export function setWebhookEndpointActive(id: string, isActive: boolean) {
  return call(
    `/v1/integrations/webhook-endpoints/${encodeURIComponent(id)}`,
    "PATCH",
    {
      isActive,
    },
  );
}
