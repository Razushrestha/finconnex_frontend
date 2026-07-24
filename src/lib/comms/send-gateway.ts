/**
 * Phase 15 — Call / SMS / Email send gateways.
 * Default: device intents (tel/sms/mailto). Production: CRM API send.
 */

import {
  openCallIntent,
  openEmailIntent,
  openSmsIntent,
} from "@/lib/leads/contact-intents";
import { getTenantContext } from "@/lib/persistence/tenant";

export type SendResult =
  | { ok: true; mode: "device" | "gateway"; providerId?: string }
  | { ok: false; message: string };

export type SendGateway = {
  readonly mode: "device" | "api";
  placeCall: (input: { phone?: string }) => Promise<SendResult>;
  sendSms: (input: {
    phone?: string;
    body?: string;
  }) => Promise<SendResult>;
  sendEmail: (input: {
    email?: string;
    subject?: string;
    body?: string;
  }) => Promise<SendResult>;
};

/** Current Lead Card behavior — opens OS composers. */
export function createDeviceIntentGateway(): SendGateway {
  return {
    mode: "device",
    async placeCall({ phone }) {
      const r = openCallIntent(phone);
      return r.ok
        ? { ok: true, mode: "device" }
        : { ok: false, message: r.message };
    },
    async sendSms({ phone, body }) {
      const r = openSmsIntent(phone, body);
      return r.ok
        ? { ok: true, mode: "device" }
        : { ok: false, message: r.message };
    },
    async sendEmail({ email, subject, body }) {
      const r = openEmailIntent(email, { subject, body });
      return r.ok
        ? { ok: true, mode: "device" }
        : { ok: false, message: r.message };
    },
  };
}

export type ApiSendGatewayConfig = {
  baseUrl: string;
  getAccessToken: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
};

async function postSend(
  config: ApiSendGatewayConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<SendResult> {
  try {
    const token = await config.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Tenant-Id": getTenantContext().tenantId,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await (config.fetchImpl ?? fetch)(
      `${config.baseUrl.replace(/\/$/, "")}${path}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      return { ok: false, message: `Send failed (${res.status})` };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, mode: "gateway", providerId: json.id };
  } catch {
    return { ok: false, message: "Send network error" };
  }
}

/** Live CRM send — Call initiate / SMS / Email. */
export function createApiSendGateway(config: ApiSendGatewayConfig): SendGateway {
  return {
    mode: "api",
    async placeCall({ phone }) {
      if (!phone?.trim()) {
        return { ok: false, message: "This lead has no phone number." };
      }
      return postSend(config, "/v1/calls/initiate", { phone: phone.trim() });
    },
    async sendSms({ phone, body }) {
      if (!phone?.trim()) {
        return { ok: false, message: "This lead has no phone number." };
      }
      return postSend(config, "/v1/messages/send", {
        phone: phone.trim(),
        body: body ?? "",
      });
    },
    async sendEmail({ email, subject, body }) {
      if (!email?.trim() || !email.includes("@")) {
        return { ok: false, message: "This lead has no email address." };
      }
      return postSend(config, "/v1/emails/send", {
        to: email.trim(),
        subject: subject ?? "",
        body: body ?? "",
      });
    },
  };
}

/** Mock fetch for `/v1/calls/initiate`, `/v1/messages/send`, `/v1/emails/send`. */
export function createMockSendFetch(
  log: { path: string; body: unknown }[] = [],
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const path = ["/v1/calls/initiate", "/v1/messages/send", "/v1/emails/send"].find(
      (p) => url.includes(p),
    );
    if (!path) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
      });
    }
    if ((init?.method ?? "GET").toUpperCase() !== "POST") {
      return new Response(JSON.stringify({ error: "method" }), { status: 405 });
    }
    let body: unknown = {};
    try {
      body = JSON.parse(String(init?.body ?? "{}"));
    } catch {
      /* empty */
    }
    log.push({ path, body });
    return new Response(JSON.stringify({ id: `prov-${log.length}`, ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

let activeGateway: SendGateway = createDeviceIntentGateway();

export function getSendGateway(): SendGateway {
  return activeGateway;
}

export function setSendGateway(gateway: SendGateway) {
  activeGateway = gateway;
}

export function enableDeviceIntentGateway() {
  activeGateway = createDeviceIntentGateway();
  return activeGateway;
}

export function enableApiSendGateway(config: ApiSendGatewayConfig) {
  activeGateway = createApiSendGateway(config);
  return activeGateway;
}
