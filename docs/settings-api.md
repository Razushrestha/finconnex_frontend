# Settings API

Workspace settings live on **`WorkspaceSettings`** and are scoped by the JWT workspace claim. The FinConnex Settings hub uses two layers:

1. **First-class columns** — branding, locale, module flags, security, SMTP.
2. **Catalog JSON** — every hub form page (`category/subpage`) as a field-id map.

Apply Prisma migration `20260913013000_workspace_settings_catalog` (`catalog JSONB` on `workspace_settings`) before using the catalog routes.

## Auth

All routes require `Authorization: Bearer <accessToken>`. The workspace is taken from the token, not from the URL.

Writes (`PATCH /v1/settings`, `PUT /v1/settings/pages/...`) require workspace **OWNER** or **ADMIN**.

Optimistic concurrency: send `expectedRevision` from the last GET. A mismatch returns **409** (`settings.error.revisionConflict`).

## First-class workspace settings

### `GET /v1/settings`

Returns the public workspace record (SMTP password is never included) plus `catalog`.

### `PATCH /v1/settings`

Partial update. Unknown keys are ignored by validation.

| Field | Notes |
| --- | --- |
| `logoKey`, `faviconKey` | Storage keys from `POST /v1/storage/upload`; `null` clears |
| `primaryColor`, `secondaryColor` | Hex colours |
| `customDomain` | FQDN |
| `timezone` | IANA timezone |
| `dateFormat` | Display format string |
| `currency` | ISO 4217 |
| `language` | BCP-47 tag |
| `enableLeads`, `enableDeals`, `enableProjects`, `enablePosts` | Module flags |
| `passwordMinLength`, `enforce2FA`, `ipAllowlist`, `sessionTimeoutMinutes` | Security |
| `smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`, `smtpFromEmail`, `smtpFromName` | Outbound mail |
| `catalog` | Partial map of `category/subpage` → field values. Each listed page **replaces** the stored page. Sibling pages are kept. |
| `expectedRevision` | Required when the client already loaded a revision |

Example — save Company Details together with brand colour:

```http
PATCH /v1/settings
Content-Type: application/json

{
  "primaryColor": "#5A32A3",
  "expectedRevision": 4,
  "catalog": {
    "organization/company-profile": {
      "companyName": "Acme Brokers",
      "tradingName": "Acme",
      "abn": "12 345 678 901"
    }
  }
}
```

### `GET /v1/settings/security`

Safe subset: `passwordMinLength`, `enforce2FA`, `ipAllowlist`, `sessionTimeoutMinutes`.

### `GET /v1/settings/capabilities`

`{ workspaceId, enabled: ["leads", "deals", ...], revision }`.

### SMTP test

- `POST /v1/settings/smtp-test` body `{ "recipient": "admin@example.com" }` — queue a connectivity job. Send `Idempotency-Key`.
- `GET /v1/settings/smtp-test/:jobId` — job state.

## Settings hub catalog

Page keys are `{category}/{subpage}` using lowercase letters, numbers, and hyphens (example: `organization/business-hours`).

Value types: string (max 8 000 chars), number, or boolean. Nested objects are rejected. At most 100 fields per page and 200 pages per workspace.

### `GET /v1/settings/pages`

```json
{
  "catalog": {
    "organization/company-profile": { "companyName": "Acme Brokers" }
  },
  "revision": 5
}
```

### `GET /v1/settings/pages/:category/:subpage`

```json
{
  "pageKey": "organization/company-profile",
  "values": { "companyName": "Acme Brokers" },
  "revision": 5
}
```

Missing pages return `{ values: {} }` with the current revision (not 404).

### `PUT /v1/settings/pages/:category/:subpage`

Replaces that page, increments `revision`, returns the full public settings record (same shape as `PATCH /v1/settings`).

```http
PUT /v1/settings/pages/organization/business-hours
Content-Type: application/json

{
  "values": {
    "weekStartsOn": "monday",
    "startTime": "09:00",
    "endTime": "17:00"
  },
  "expectedRevision": 5
}
```

## FinConnex frontend

| Surface | Persistence |
| --- | --- |
| Generic hub forms (`SettingsFormClient`) | `PATCH /v1/settings` with `catalog[category/subpage]` plus mapped first-class fields (`primaryColor`, `timezone`, `dateFormat`, `currency`, `language`, logos, password length, session timeout) |
| SMTP | `PATCH /v1/settings` SMTP columns + smtp-test jobs |
| Modules | `GET /v1/settings/capabilities` and flag PATCH |
| Users, workspaces, billing, recycle bin, custom fields, pipelines, workflows, tickets, notifications, Calendly | Existing module APIs (not the catalog bag) |
| My preferences | Workspace member `preferences` JSON |

The Next.js BFF already proxies `/v1/settings/*` (including `pages`) for signed-in browsers.

## Errors

| Message key | HTTP |
| --- | --- |
| `settings.error.notFound` | 404 |
| `settings.error.revisionConflict` | 409 |
| `settings.error.invalidPageKey` | 400 |
| `settings.error.invalidPageValues` | 400 |
| `settings.error.catalogTooLarge` | 400 |
| `settings.error.rateLimited` | 429 (SMTP test) |
