/**
 * Phase D2 — Payment demo gateway (mirrors send-gateway.ts).
 * Creates a Pending payment, mock-charges, then Completes + applies to invoice.
 */

import {
  appendPaymentAudit,
  nextPaymentIds,
  upsertPayment,
  type Payment,
  type PaymentMethod,
} from "@/lib/finance/payments/types";
import {
  applyPaymentToInvoice,
  appendInvoiceAudit,
  getInvoiceById,
  upsertInvoice,
  type Invoice,
} from "@/lib/finance/invoices/types";
import { formatAUD, formatFinanceDate } from "@/lib/finance/shared";
import { loadSettingsValues } from "@/lib/settings/settings-store";

export type PayResult =
  | { ok: true; payment: Payment; invoice: Invoice; providerId: string }
  | { ok: false; message: string };

export type PayChargeInput = {
  invoiceId: string;
  amount: number;
  method?: PaymentMethod;
  actor: string;
  /** Simulate decline */
  fail?: boolean;
};

/** Respect Settings → Finance → Payment Gateways Stripe toggle when present. */
export function isStripeDemoEnabled(): boolean {
  try {
    const values = loadSettingsValues("finance/payment-gateways");
    if (typeof values.stripeEnabled === "boolean") return values.stripeEnabled;
    return true;
  } catch {
    return true;
  }
}

export function createMockPayFetch(
  log: { path: string; body: unknown }[] = [],
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (!url.includes("/v1/payments/charge")) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
      });
    }
    if ((init?.method ?? "GET").toUpperCase() !== "POST") {
      return new Response(JSON.stringify({ error: "method" }), { status: 405 });
    }
    let body: { amount?: number; fail?: boolean } = {};
    try {
      body = JSON.parse(String(init?.body ?? "{}")) as typeof body;
    } catch {
      /* empty */
    }
    log.push({ path: "/v1/payments/charge", body });
    if (body.fail) {
      return new Response(
        JSON.stringify({ error: "card_declined", message: "Card declined" }),
        { status: 402 },
      );
    }
    await new Promise((r) => setTimeout(r, 280));
    return new Response(
      JSON.stringify({
        id: `pi_demo_${log.length}_${Date.now()}`,
        status: "succeeded",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
}

async function mockCharge(input: {
  amount: number;
  fail?: boolean;
}): Promise<{ ok: true; providerId: string } | { ok: false; message: string }> {
  const fetchImpl = createMockPayFetch();
  try {
    const res = await fetchImpl("mock://crm/v1/payments/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: false, message: json.message ?? `Charge failed (${res.status})` };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, providerId: json.id ?? `pi_demo_${Date.now()}` };
  } catch {
    return { ok: false, message: "Payment network error" };
  }
}

/**
 * Demo live charge: Pending payment → gateway → Complete + invoice apply.
 */
export async function chargePaymentDemoLive(
  input: PayChargeInput,
): Promise<PayResult> {
  const invoice = getInvoiceById(input.invoiceId);
  if (!invoice) return { ok: false, message: "Invoice not found" };
  if (["Void", "Cancelled", "Draft"].includes(invoice.status)) {
    return { ok: false, message: `Cannot pay a ${invoice.status} invoice` };
  }
  if (input.amount <= 0) return { ok: false, message: "Amount must be positive" };
  if (input.amount > invoice.amountDue + 0.001) {
    return {
      ok: false,
      message: `Amount exceeds balance ${formatAUD(invoice.amountDue)}`,
    };
  }

  const method: PaymentMethod = input.method ?? "Stripe";
  if (method === "Stripe" && !isStripeDemoEnabled()) {
    return {
      ok: false,
      message: "Stripe is disabled in Settings → Payment Gateways",
    };
  }

  const ids = nextPaymentIds();
  let payment = upsertPayment(
    appendPaymentAudit(
      {
        id: ids.id,
        paymentId: ids.paymentId,
        invoiceId: invoice.id,
        invoiceRef: invoice.invoiceId,
        clientName: invoice.clientName,
        amount: input.amount,
        method,
        status: "Pending",
        reference: undefined,
        notes: "Demo gateway charge",
        receivedAt: formatFinanceDate(),
        recordedBy: input.actor,
        createdAt: formatFinanceDate(),
        audit: [],
      },
      "Recorded (pending gateway)",
      input.actor,
    ),
  );

  const charged = await mockCharge({
    amount: input.amount,
    fail: input.fail,
  });

  if (!charged.ok) {
    payment = upsertPayment(
      appendPaymentAudit(
        { ...payment, status: "Failed", reference: `fail_${Date.now()}` },
        `Failed: ${charged.message}`,
        "System",
      ),
    );
    return { ok: false, message: charged.message };
  }

  payment = upsertPayment(
    appendPaymentAudit(
      {
        ...payment,
        status: "Completed",
        reference: charged.providerId,
      },
      "Marked completed (demo gateway)",
      "System",
    ),
  );

  const paid = applyPaymentToInvoice(invoice, input.amount);
  const nextInvoice = upsertInvoice(
    appendInvoiceAudit(
      paid,
      `Gateway payment ${formatAUD(input.amount)} (${charged.providerId})`,
      input.actor,
    ),
  );

  return {
    ok: true,
    payment,
    invoice: nextInvoice,
    providerId: charged.providerId,
  };
}
