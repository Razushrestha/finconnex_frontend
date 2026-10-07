import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sendViaSendGrid = vi.hoisted(() =>
  vi.fn<(input: Record<string, unknown>) => Promise<void>>(async () => {}),
);
const getSession = vi.hoisted(() => vi.fn(async () => ({ user: "admin" })));

vi.mock("@/lib/auth/session", () => ({ getSession }));
vi.mock("@/lib/auth/crm-server", () => ({
  crmBaseUrl: () => "https://crm.test",
  resolveLiveCrmAuth: async () => ({ accessToken: "jwt-user", refreshToken: null }),
}));
// Routes send through deliverMail; with a SendGrid key it is sendViaSendGrid.
const deliverMail = vi.hoisted(() =>
  vi.fn(async (input: Record<string, unknown>) => {
    await sendViaSendGrid(input);
    return "sendgrid" as const;
  }),
);

type SendGridPayload = {
  from: { email: string };
  reply_to?: { email: string };
  personalizations: Array<{ cc?: Array<{ email: string }> }>;
};

describe("sendViaSendGrid Reply-To and Cc", () => {
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () => new Response("", { status: 202 }),
  );

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("SENDGRID_API_KEY", "SG.test");
    vi.stubEnv("SENDGRID_FROM_EMAIL", "notifications@finconnex.com");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  async function send(extra: Record<string, unknown>) {
    const { sendViaSendGrid: real } = await vi.importActual<
      typeof import("@/lib/emails/sendgrid-server")
    >("@/lib/emails/sendgrid-server");
    await real({
      to: ["ada@example.com"],
      subject: "Hello",
      text: "Hi",
      ...extra,
    });
    return JSON.parse(String(fetchMock.mock.calls[0][1].body)) as SendGridPayload;
  }

  it("sets Reply-To and Cc but keeps the verified sender as From", async () => {
    const payload = await send({
      replyTo: "sam@finconnex.com",
      cc: ["admin@finconnex.com"],
    });
    expect(payload.reply_to).toEqual({ email: "sam@finconnex.com" });
    expect(payload.personalizations[0].cc).toEqual([{ email: "admin@finconnex.com" }]);
    expect(payload.from.email).toBe("notifications@finconnex.com");
  });

  it("adds no Reply-To when none is given or it is not an address", async () => {
    expect("reply_to" in (await send({}))).toBe(false);
    fetchMock.mockClear();
    expect("reply_to" in (await send({ replyTo: "not an address" }))).toBe(false);
  });
});

describe("public booking mail endpoint", () => {
  beforeEach(() => {
    sendViaSendGrid.mockClear();
    vi.resetModules();
    vi.doMock("@/lib/emails/sendgrid-server", () => ({
      sendViaSendGrid,
      deliverMail,
      sendgridConfigured: () => true,
    }));
  });
  afterEach(() => {
    vi.doUnmock("@/lib/emails/sendgrid-server");
  });

  async function post(body: Record<string, unknown>) {
    const { POST } = await import("@/app/api/book/confirm-mail/route");
    return POST(
      new Request("https://crm.test/api/book/confirm-mail", {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin", "content-type": "application/json" },
        body: JSON.stringify({
          to: "ada@example.com",
          subject: "Hello",
          html: "<p>Hi</p>",
          ...body,
        }),
      }),
    );
  }

  it("passes a valid Reply To and Cc through", async () => {
    const res = await post({ replyTo: "sam@finconnex.com", cc: ["admin@finconnex.com"] });
    expect(res.status).toBe(200);
    expect(sendViaSendGrid).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: ["admin@finconnex.com"],
        replyTo: "sam@finconnex.com",
      }),
    );
  });

  it("still sends the confirmation, without the extras, when they are malformed", async () => {
    const res = await post({
      replyTo: "a@b.co, evil@x.co",
      cc: ["nope", "<x@y.co>", "ok@y.co", 5, "two@y.co", "three@y.co", "four@y.co"],
    });
    expect(res.status).toBe(200);
    const sent = sendViaSendGrid.mock.calls[0][0] as { cc: string[]; replyTo?: string };
    expect(sent.replyTo).toBeUndefined();
    // Bad entries are dropped, and a guest request can add at most three.
    expect(sent.cc).toEqual(["ok@y.co", "two@y.co", "three@y.co"]);
  });

  it("is unchanged for a request with neither", async () => {
    await post({});
    expect(sendViaSendGrid).toHaveBeenCalledWith(
      expect.objectContaining({ cc: [], replyTo: undefined }),
    );
  });
});

describe("signed-in mail delivery endpoint", () => {
  beforeEach(() => {
    sendViaSendGrid.mockClear();
    vi.resetModules();
    vi.doMock("@/lib/emails/sendgrid-server", () => ({ sendViaSendGrid, deliverMail }));
  });
  afterEach(() => {
    vi.doUnmock("@/lib/emails/sendgrid-server");
  });

  it("forwards Reply To", async () => {
    const { POST } = await import("@/app/api/auth/mail/deliver/route");
    const res = await POST(
      new Request("https://crm.test/api/auth/mail/deliver", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: ["ada@example.com"],
          cc: ["admin@finconnex.com"],
          replyTo: " sam@finconnex.com ",
          subject: "Hello",
          text: "Hi",
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(sendViaSendGrid).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: ["admin@finconnex.com"],
        replyTo: "sam@finconnex.com",
      }),
    );
  });
});

describe("deliverMail without a SendGrid key", () => {
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify({ data: { delivered: "crm" } }), { status: 200 }),
  );

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("SENDGRID_API_KEY", "");
    vi.stubEnv("SENDGRID_FROM_EMAIL", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  async function real() {
    return (
      await vi.importActual<typeof import("@/lib/emails/sendgrid-server")>(
        "@/lib/emails/sendgrid-server",
      )
    ).deliverMail;
  }

  it("asks the CRM to send a guest's booking mail with the booking token", async () => {
    const deliver = await real();
    await expect(
      deliver(
        { to: ["ada@example.com"], subject: "Confirmed", text: "Hi", replyTo: "sam@x.co" },
        { bookingToken: "cancel-tok" },
      ),
    ).resolves.toBe("crm");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://crm.test/v1/public/booking/manage/cancel-tok/mail");
    expect(new Headers(init.headers).has("authorization")).toBe(false);
    expect(JSON.parse(String(init.body))).toEqual(
      expect.objectContaining({ to: ["ada@example.com"], replyTo: "sam@x.co", subject: "Confirmed" }),
    );
  });

  it("asks the CRM to send as the signed-in user otherwise", async () => {
    const deliver = await real();
    await deliver(
      {
        to: ["ada@example.com"],
        subject: "Invite",
        text: "Hi",
        attachments: [{ filename: "a.pdf", content: "data:application/pdf;base64,QUJD" }],
      },
      { accessToken: "jwt-user" },
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://crm.test/v1/mail/relay");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer jwt-user");
    expect(JSON.parse(String(init.body)).attachments[0]).toEqual(
      expect.objectContaining({ filename: "a.pdf", content: "QUJD", disposition: "attachment" }),
    );
  });

  it("reports the CRM's refusal instead of claiming it was sent", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Mail about a booking can only go to its guest" }), {
        status: 403,
      }),
    );
    const deliver = await real();
    await expect(
      deliver({ to: ["x@y.co"], subject: "S", text: "T" }, { bookingToken: "t" }),
    ).rejects.toThrow(/only go to its guest/);
  });

  it("sends the HTML through the CRM mailbox when SendGrid is out of credits", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "SG.test-key");
    vi.stubEnv("SENDGRID_FROM_EMAIL", "from@example.com");
    fetchMock.mockImplementation(async (url) => {
      if (String(url).includes("api.sendgrid.com")) {
        return new Response(
          JSON.stringify({ errors: [{ message: "Maximum credits exceeded" }] }),
          { status: 401 },
        );
      }
      return new Response(JSON.stringify({ data: { delivered: "crm" } }), { status: 200 });
    });
    const deliver = await real();
    await expect(
      deliver(
        {
          to: ["ada@example.com"],
          subject: "Your appointment is confirmed",
          text: "Hi",
          html: "<table><tr><td>Your Appointment is Confirmed!</td></tr></table>",
        },
        { accessToken: "jwt-user" },
      ),
    ).resolves.toBe("crm");
    const relay = fetchMock.mock.calls.find((call) => String(call[0]).includes("/v1/mail/relay"));
    expect(relay).toBeTruthy();
    expect(JSON.parse(String(relay?.[1].body))).toEqual(
      expect.objectContaining({
        html: "<table><tr><td>Your Appointment is Confirmed!</td></tr></table>",
        text: "Hi",
      }),
    );
  });

  it("explains that mail is not configured when there is no way to send", async () => {
    const deliver = await real();
    await expect(deliver({ to: ["x@y.co"], subject: "S", text: "T" })).rejects.toThrow(
      /not configured/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
