# FinConnex Playwright E2E

Full-app browser tests covering public pages, auth guards, and authenticated CRM modules.

## Prerequisites

1. **Either** leave the default (Playwright starts `next dev` on port 3000),
   **or** run `npm run dev` yourself and set `$env:E2E_SKIP_WEBSERVER="1"`.
2. For authenticated suites, set CRM credentials:

```powershell
$env:E2E_EMAIL="you@company.com"
$env:E2E_PASSWORD="your-password"
```

If every test fails with `net::ERR_CONNECTION_REFUSED`, the app is not running on
`localhost:3000` — start it or unset `E2E_SKIP_WEBSERVER`.

Defaults (legacy smoke): `admin` / `admin123` — only work if that account exists on the CRM.

## Commands

```powershell
# Install browsers once
npx playwright install chromium

# Full suite (starts `npm run dev` unless a server is already up)
npm run test:e2e

# Already running `npm run dev`
$env:E2E_SKIP_WEBSERVER="1"
npm run test:e2e

# UI / headed
npm run test:e2e:ui
npm run test:e2e:headed

# Public + auth-guard only (no CRM login required)
npm run test:e2e:public
```

## Suites

| Spec | Coverage |
|------|----------|
| `auth-guard.spec.ts` | Anonymous redirects to `/login` |
| `public.spec.ts` | Public forms, booking, portals login, journeys |
| `sales.spec.ts` | Leads / contacts / companies / deals |
| `activities.spec.ts` | Tasks, calls, messages, emails, meetings, notes, reminders, calendar |
| `finance.spec.ts` | Estimates, quotes, invoices, credit notes, payments, products |
| `marketing.spec.ts` | Email / SMS / WhatsApp / forms / linktree / inbox |
| `documents.spec.ts` | Library, requests, e-sign |
| `platform.spec.ts` | Booking, support, portals, reports, analytics, etc. |
| `settings.spec.ts` | Settings hubs + preferences |
| `auth.setup.ts` | Saves authenticated storage state to `e2e/.auth/user.json` |

## Auth

`e2e/auth.setup.ts` logs in via the UI and writes `e2e/.auth/user.json` (gitignored). The `chromium` project reuses that storage state for all CRM modules.
