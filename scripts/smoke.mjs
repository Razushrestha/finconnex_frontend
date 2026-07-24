/**
 * FinConnex whole-system HTTP smoke test
 * Usage: node scripts/smoke.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://127.0.0.1:3000";

const results = [];

function add(suite, name, pass, detail = "") {
  results.push({ suite, name, pass: Boolean(pass), detail });
}

function okStatus(code) {
  const n = Number(code);
  return n >= 200 && n < 400;
}

function parseSetCookie(res) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  if (raw.length) return raw.map((c) => c.split(";")[0]).join("; ");
  const single = res.headers.get("set-cookie");
  if (!single) return "";
  return single
    .split(/,(?=[^;]+?=)/)
    .map((p) => p.trim().split(";")[0])
    .filter((p) => p.includes("="))
    .join("; ");
}

async function hit(path, { cookie, method = "GET", body, follow = false } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: follow ? "follow" : "manual",
  });
  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }
  return {
    status: res.status,
    location: res.headers.get("location") || "",
    cookie: parseSetCookie(res),
    text,
    url: res.url || `${BASE}${path}`,
  };
}

function isLoginRedirect(r) {
  return (
    (r.status === 307 || r.status === 302 || r.status === 303) &&
    r.location.includes("/login")
  );
}

async function expectCrm(suite, path, cookie) {
  const r = await hit(path, { cookie });
  const pass = okStatus(r.status) && !isLoginRedirect(r) && r.status !== 404;
  add(suite, path, pass, `${r.status}${r.location ? ` → ${r.location}` : ""}`);
}

async function expectPublic(suite, path) {
  const r = await hit(path);
  const pass =
    okStatus(r.status) &&
    !isLoginRedirect(r) &&
    r.status !== 404 &&
    !(r.status >= 300 && r.status < 400 && r.location.includes("/login"));
  add(suite, path, pass, `${r.status}${r.location ? ` → ${r.location}` : ""}`);
}

async function expectGuard(suite, path) {
  const r = await hit(path);
  add(suite, `guard ${path}`, isLoginRedirect(r), `${r.status} ${r.location}`);
}

async function ensureServer() {
  try {
    await hit("/login");
  } catch (err) {
    const cause = err?.cause?.code || err?.code || "";
    console.error(
      `\nCannot reach ${BASE} (${cause || err.message}).\n` +
        `Start the app first, then re-run smoke:\n` +
        `  npm run dev\n` +
        `  node scripts/smoke.mjs ${BASE}\n`,
    );
    process.exit(1);
  }
}

async function main() {
  console.log(`\nFinConnex whole-system smoke → ${BASE}\n`);
  await ensureServer();

  // ----- AUTH -----
  const bad = await hit("/api/auth/login", {
    method: "POST",
    body: { username: "admin", password: "wrong" },
  });
  add("auth", "bad password rejected", bad.status === 401 || bad.status === 400, String(bad.status));

  const login = await hit("/api/auth/login", {
    method: "POST",
    body: { username: "admin", password: "admin123" },
  });
  const cookie = login.cookie;
  const loginOk =
    login.status >= 200 &&
    login.status < 300 &&
    cookie.includes("finconnex_session");
  add("auth", "POST /api/auth/login", loginOk, `${login.status} cookie=${cookie ? "yes" : "no"}`);

  if (!loginOk) {
    printReport();
    process.exit(1);
  }

  const me = await hit("/api/auth/me", { cookie });
  add("auth", "GET /api/auth/me", me.status === 200 && me.text.includes("admin"), String(me.status));

  await expectGuard("auth", "/");
  await expectGuard("auth", "/finance");
  await expectGuard("auth", "/notifications");

  // ----- PUBLIC -----
  const PUBLIC = [
    "/login",
    "/f/home-loan-lead",
    "/f/doc-intake",
    "/l/john-smith",
    "/l/sydney",
    "/book/john-discovery",
    "/book/site-visit-syd",
    "/sign/sig-anderson-1",
    "/p/greystone/login",
    "/p/harbour/login",
    "/j/jny-greystone-refinance",
    "/j/jny-harbour-packaging",
  ];
  for (const p of PUBLIC) await expectPublic("public", p);

  // ----- CRM LISTS -----
  const LISTS = [
    "/",
    "/work-queue",
    "/sales/leads",
    "/sales/contacts",
    "/sales/companies",
    "/sales/deals",
    "/sales/forecasting",
    "/activities/tasks",
    "/activities/calls",
    "/activities/messages",
    "/activities/emails",
    "/activities/meetings",
    "/activities/notes",
    "/activities/reminders",
    "/activities/calendar",
    "/activities/team-chat",
    "/booking",
    "/documents/library",
    "/documents/requests",
    "/documents/signature",
    "/marketing/email",
    "/marketing/sms",
    "/marketing/whatsapp",
    "/marketing/forms",
    "/marketing/linktree",
    "/marketing/inbox",
    "/finance",
    "/finance/estimates",
    "/finance/quotations",
    "/finance/invoices",
    "/finance/payments",
    "/finance/products",
    "/team",
    "/support",
    "/portals",
    "/reports",
    "/analytics",
    "/resources",
    "/calculator",
    "/notifications",
    "/journeys",
    "/time-tracking",
    "/rules",
    "/settings",
    "/settings/organization",
    "/settings/organization/company-profile",
    "/settings/crm-configuration/industry-preset",
    "/settings/communication/facebook-page",
    "/settings/system/queue-monitor",
    "/settings/my-preferences",
    "/settings/notifications/in-app-notifications",
  ];
  for (const p of LISTS) await expectCrm("crm-list", p, cookie);

  // ----- CREATE -----
  const CREATES = [
    "/sales/leads/create",
    "/sales/contacts/create",
    "/sales/companies/create",
    "/sales/deals/create",
    "/activities/tasks/create",
    "/activities/calls/create",
    "/activities/messages/create",
    "/activities/emails/create",
    "/activities/meetings/create",
    "/activities/notes/create",
    "/activities/reminders/create",
    "/booking/create",
    "/documents/requests/create",
    "/documents/signature/create",
    "/marketing/email/create",
    "/marketing/sms/create",
    "/marketing/whatsapp/create",
    "/marketing/forms/create",
    "/marketing/linktree/create",
    "/finance/estimates/create",
    "/finance/quotations/create",
    "/finance/invoices/create",
    "/finance/payments/create",
    "/finance/products/create",
    "/support/create",
    "/portals/create",
    "/reports/create",
    "/resources/create",
    "/journeys/create",
    "/time-tracking/create",
  ];
  for (const p of CREATES) await expectCrm("crm-create", p, cookie);

  // ----- SEED DETAILS -----
  const DETAILS = [
    "/booking/bp1",
    "/documents/requests/dr1",
    "/documents/signature/sr1",
    "/marketing/email/ec1",
    "/marketing/sms/sc1",
    "/marketing/whatsapp/wc1",
    "/marketing/forms/mf1",
    "/marketing/linktree/lt1",
    "/finance/estimates/est1",
    "/finance/quotations/quo1",
    "/finance/invoices/inv1",
    "/finance/payments/pay1",
    "/support/tk1",
    "/portals/prt1",
    "/reports/rp1",
    "/resources/res1",
    "/journeys/lj1",
    "/time-tracking/te1",
  ];
  for (const p of DETAILS) await expectCrm("crm-detail", p, cookie);

  // ----- PORTAL (with CRM session — pages should load) -----
  const PORTAL = [
    "/p/greystone",
    "/p/greystone/documents",
    "/p/greystone/invoices",
    "/p/greystone/deals",
    "/p/greystone/tasks",
    "/p/greystone/reports",
    "/p/harbour",
    "/p/harbour/documents",
    "/p/apex",
  ];
  for (const p of PORTAL) await expectCrm("portal", p, cookie);

  // ----- CONTENT SNIFF -----
  const sniff = [
    ["/", "FinConnex"],
    ["/finance", "Sales Ops"],
    ["/journeys", "Journey"],
    ["/notifications", "Notification"],
    ["/calculator", "Calculator"],
    ["/resources", "Resource"],
    ["/time-tracking", "Time"],
    ["/marketing/linktree", "Broker"],
    ["/l/john-smith", "John"],
  ];
  for (const [path, needle] of sniff) {
    const r = await hit(path, {
      cookie: path.startsWith("/l/") ? undefined : cookie,
      follow: true,
    });
    const pass = r.status === 200 && r.text.toLowerCase().includes(needle.toLowerCase());
    add("sniff", `${path} contains "${needle}"`, pass, `status=${r.status} len=${r.text.length}`);
  }

  // logout
  const logout = await hit("/api/auth/logout", { method: "POST", cookie });
  add("auth", "POST /api/auth/logout", logout.status >= 200 && logout.status < 300, String(logout.status));

  printReport();
  const fail = results.filter((r) => !r.pass).length;
  process.exit(fail ? 1 : 0);
}

function printReport() {
  const bySuite = new Map();
  for (const r of results) {
    if (!bySuite.has(r.suite)) bySuite.set(r.suite, []);
    bySuite.get(r.suite).push(r);
  }

  for (const [suite, rows] of bySuite) {
    const ok = rows.filter((r) => r.pass).length;
    console.log(`\n== ${suite}  ${ok}/${rows.length} ==`);
    for (const r of rows) {
      console.log(
        `${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail && !r.pass ? `  (${r.detail})` : ""}`,
      );
    }
  }

  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass).length;
  console.log(`\nTOTAL  ${pass}/${results.length} passed · ${fail} failed\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
