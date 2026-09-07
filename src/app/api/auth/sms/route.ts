import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { resolveLiveCrmAuth } from "@/lib/auth/crm-server";

const TRIAL_TEMPLATES = new Set([
  "sms_2fa",
  "sms_appointment_reminders",
  "sms_order_confirmation",
  "sms_delivery_updates",
  "sms_customer_support",
  "sms_marketing_promotions",
  "sms_event_notifications",
  "sms_account_alerts",
  "sms_feedback_surveys",
  "sms_internal_alerts",
]);

function clean(value?: string | null) {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

export async function POST(request: Request) {
  const session = await getSession();
  const live = await resolveLiveCrmAuth();
  if (!session && !live?.accessToken) {
    return NextResponse.json({ error: "Sign in to send SMS." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    body?: string;
    channel?: string;
  };
  const note = (payload.body ?? "").trim();
  if (!note) {
    return NextResponse.json({ error: "Message body is required." }, { status: 400 });
  }

  const accountSid = clean(process.env.TWILIO_ACCOUNT_SID);
  const authToken = clean(process.env.TWILIO_AUTH_TOKEN);
  const from = clean(process.env.TWILIO_PHONE_NUMBER);
  const to =
    clean(process.env.TWILIO_SMS_TO) ||
    clean(process.env.NEXT_PUBLIC_TWILIO_SMS_TO);
  const trial = clean(process.env.TWILIO_SMS_TRIAL_TEMPLATE);
  const channel = (payload.channel ?? "sms").toLowerCase();

  if (!accountSid || !authToken || !from || !to) {
    return NextResponse.json(
      { error: "Twilio from/to numbers are not configured." },
      { status: 503 },
    );
  }

  const smsBody =
    trial && TRIAL_TEMPLATES.has(trial) ? trial : note;
  const fromNumber =
    channel === "whatsapp" && !from.startsWith("whatsapp:")
      ? `whatsapp:${from}`
      : from;
  const toNumber =
    channel === "whatsapp" && !to.startsWith("whatsapp:")
      ? `whatsapp:${to}`
      : to;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: toNumber,
        Body: smsBody,
      }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    sid?: string;
    status?: string;
    code?: number;
    message?: string;
  };
  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          data.message ||
          `Twilio did not send the SMS (${data.code ?? res.status}).`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    sid: data.sid,
    status: data.status,
    from: fromNumber,
    to: toNumber,
    trialTemplate: trial && TRIAL_TEMPLATES.has(trial) ? trial : null,
  });
}
