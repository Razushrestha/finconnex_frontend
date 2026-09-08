import "server-only";

/** Place a Twilio Voice call from Next env when hosted CRM returns 503. */

const E164 = /^\+[1-9]\d{7,14}$/;

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function twilioVoiceFromNextEnv(): {
  accountSid: string;
  authToken: string;
  from: string;
  twimlUrl: string;
  statusCallbackUrl: string;
} | null {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_VOICE_FROM") || env("TWILIO_PHONE_NUMBER");
  const twimlUrl =
    env("TWILIO_VOICE_TWIML_URL") ||
    "https://webhooks.twilio.com/v1/Voice/Template/voice_auto_response";
  const statusCallbackUrl =
    env("TWILIO_VOICE_STATUS_CALLBACK_URL") ||
    "https://finconnex.payperless.app/webhooks/twilio/voice";
  if (!accountSid.startsWith("AC") || !authToken) return null;
  if (!E164.test(from) || !isHttps(twimlUrl)) {
    return null;
  }
  return { accountSid, authToken, from, twimlUrl, statusCallbackUrl };
}

export function pickCallPhone(raw: unknown): string | null {
  const rec =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const nested =
    rec?.data && typeof rec.data === "object" && !Array.isArray(rec.data)
      ? (rec.data as Record<string, unknown>)
      : rec;
  if (nested) {
    for (const key of ["phone", "fromNumber", "to", "toNumber"]) {
      const value = nested[key];
      if (typeof value === "string" && E164.test(value.trim())) {
        return value.trim();
      }
    }
  }
  const fallback = env("TWILIO_SMS_TO") || env("NEXT_PUBLIC_TWILIO_SMS_TO");
  return E164.test(fallback) ? fallback : null;
}

export async function createTwilioVoiceCall(to: string): Promise<{
  sid: string;
  status: string;
}> {
  const cfg = twilioVoiceFromNextEnv();
  if (!cfg) {
    throw new Error("sms.error.voiceNotConfigured");
  }
  if (!E164.test(to)) {
    throw new Error("sms.error.voiceRecipientInvalid");
  }
  const body = new URLSearchParams();
  body.set("To", to);
  body.set("From", cfg.from);
  body.set("Url", cfg.twimlUrl);
  const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString(
    "base64",
  );
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
  const json = (await res.json()) as {
    sid?: string;
    status?: string;
    message?: string;
    code?: number;
  };
  if (!res.ok || !json.sid) {
    throw new Error(
      typeof json.message === "string" && json.message.trim()
        ? json.message
        : `Twilio Voice create failed (${res.status})`,
    );
  }
  return { sid: json.sid, status: json.status ?? "queued" };
}

export function parseDialPath(path: string[]): { workspaceId: string; callId: string } | null {
  if (
    path.length === 5 &&
    path[0] === "workspaces" &&
    path[2] === "calls" &&
    path[4] === "dial"
  ) {
    return { workspaceId: path[1]!, callId: path[3]! };
  }
  if (path.length === 3 && path[0] === "calls" && path[2] === "dial") {
    return { workspaceId: "", callId: path[1]! };
  }
  return null;
}
