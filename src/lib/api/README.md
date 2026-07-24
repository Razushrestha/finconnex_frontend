# FinConnex API contract (frontend ↔ backend)

The CRM UI talks to **`@/lib/api`**. While the backend is in progress, the client runs in **`local`** mode (session adapters). When you ship the API, set one env var and the same UI methods hit your server.

## Switch to remote

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Requests go to `{BASE}/v1/...` with `credentials: "include"` (session cookies).

## Frontend usage

```ts
import { api } from "@/lib/api";

const result = await api.leads.create({
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex@company.com",
  status: "New",
  owner: "John Smith",
});

if (!result.ok) {
  // result.error: ApiError { status, code, message, fields? }
  return;
}

console.log(result.data.id);
```

## Error shape (please match)

```json
{
  "code": "CONFLICT",
  "message": "Email must be unique across Leads and Contacts",
  "fields": { "email": "..." },
  "requestId": "req_..."
}
```

| HTTP | `code` (typical) |
|------|------------------|
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` (uniqueness / final status) |
| 422 | `VALIDATION` |
| 500 | `INTERNAL` |

## Endpoint catalog

See `src/lib/api/endpoints.ts` (`ENDPOINT_CATALOG`) — source of truth for paths.

### Soft-delete (§28.1)

`DELETE /{resource}/:id` must **not** hard-wipe. Move to Recycle Bin and return `{ id, recycleBinId? }`. Restore via `POST /rules/recycle-bin/:id/restore`.

### Status rules (§28.2)

- Lead `Converted` is final → `409` if changed
- Deal `Closed Won` / `Closed Lost` final
- Ticket `Closed` may reopen
- Campaign `Completed` cannot restart (marketing endpoints TBD)

### Uniqueness (§28.1)

- Email unique across **Leads + Contacts**
- Deal **name + account** unique

## Auth

Today the Next app owns `/api/auth/*`. Options:

1. Backend issues the same cookie name `finconnex_session`, or  
2. Next BFF proxies login/me/logout to your auth service.

`api.auth.*` already abstracts this for the UI.

## Files

| Path | Role |
|------|------|
| `contracts.ts` | TypeScript interfaces the backend must satisfy |
| `endpoints.ts` | REST path catalog |
| `local/*` | Current session implementation |
| `remote.ts` | HTTP client for your API |
| `client.ts` | Mode switch + `api` singleton |
| `errors.ts` / `http.ts` / `types.ts` | Shared plumbing |

## Rollout checklist for backend

1. Implement auth + leads CRUD first (UI already uses create/list patterns)
2. Match error JSON + soft-delete semantics
3. Set `NEXT_PUBLIC_API_BASE_URL` in staging
4. Smoke: create lead → list board → delete → restore from Rules hub
