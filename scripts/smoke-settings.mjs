const BASE = process.argv[2] || "http://127.0.0.1:3000";
import {
  allSettingsPaths,
  SETTINGS_CATEGORIES,
  MY_PREFERENCES_TABS,
} from "../src/lib/settings/settings-config.ts";

async function main() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const set =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  const cookie = set.length
    ? set.map((c) => c.split(";")[0]).join("; ")
    : (res.headers.get("set-cookie") || "").split(";")[0];

  const paths = [
    "/settings/my-preferences",
    "/settings/organization/regional-settings",
    "/settings/crm-configuration/industry-preset",
    "/settings/communication/whatsapp-business",
    "/settings/notifications/email-notifications",
    "/settings/finance/payment-gateways",
    "/settings/security/password-policy",
    "/settings/system/queue-monitor",
    "/settings/marketplace/template-marketplace",
    ...SETTINGS_CATEGORIES.map((c) => `/settings/${c.slug}`),
    ...allSettingsPaths().map((p) => p.href),
  ];

  let pass = 0;
  let fail = 0;
  const fails = [];
  for (const p of paths) {
    const r = await fetch(`${BASE}${p}`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    let status = r.status;
    const loc = r.headers.get("location") || "";
    if (status >= 300 && status < 400 && loc) {
      const abs = loc.startsWith("http") ? loc : `${BASE}${loc}`;
      status = (
        await fetch(abs, { headers: { Cookie: cookie }, redirect: "manual" })
      ).status;
    }
    const ok = status >= 200 && status < 400 && status !== 404;
    if (ok) pass++;
    else {
      fail++;
      fails.push(`${status} ${p}`);
    }
  }

  const pref = await fetch(`${BASE}/settings/my-preferences`, {
    headers: { Cookie: cookie },
  });
  const html = await pref.text();
  const tabsOk = MY_PREFERENCES_TABS.every((t) => html.includes(t.title));

  console.log(`HTTP ${pass}/${paths.length} · fail ${fail}`);
  console.log(`My Preferences tabs in HTML: ${tabsOk ? "PASS" : "FAIL"}`);
  if (fails.length) console.log(fails.slice(0, 20).join("\n"));
  process.exit(fail || !tabsOk ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
