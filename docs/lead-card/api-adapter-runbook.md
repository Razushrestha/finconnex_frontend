# Lead Card — API / multi-tenant adapter runbook

**Phase:** 9 (readiness) → 10 (implementation)  
**Code:** `src/lib/persistence/`

Today the app uses a **session** persistence driver with tenant-scoped keys  
`fc:{tenantId}:{logicalKey}` (default tenant: `demo`).

---

## 1. Bootstrap when backend is live

Preferred (Session 14): auth bridge + module REST hydrate:

```ts
import { runLiveApiCutover } from "@/lib/persistence";

await runLiveApiCutover();
// → /api/auth/me + /api/auth/crm-token → tenant + Bearer
// → GET LEAD_CARD_MODULE_ROUTES when NEXT_PUBLIC_CRM_API_URL is set
```

Lower-level (Session 10) still works:

```ts
import { bootstrapPersistence } from "@/lib/persistence";

await bootstrapPersistence({
  mode: "api",
  baseUrl: process.env.NEXT_PUBLIC_CRM_API_URL!,
  tenantId: session.orgId,
  getAccessToken: () => session.accessToken,
  // hydrateKeys defaults to LEAD_CARD_HYDRATE_KEYS
});
```

App shell mounts `PersistenceBootstrap`, which runs `runLiveApiCutover()`.

Lower-level equivalent:

```ts
import { setTenantContext, enableApiPersistence } from "@/lib/persistence";
import { LEAD_CARD_HYDRATE_KEYS } from "@/lib/leads/phase-9";

setTenantContext({ tenantId: session.orgId });

const api = enableApiPersistence({
  baseUrl: process.env.NEXT_PUBLIC_CRM_API_URL!,
  getAccessToken: () => session.accessToken,
});

await api.hydrate([...LEAD_CARD_HYDRATE_KEYS]);
```

Hydrate key list source of truth: `LEAD_CARD_HYDRATE_KEYS` in `src/lib/leads/phase-9.ts`.

Env:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CRM_API_URL` | API origin, e.g. `https://api.finconnex.app` |
| `NEXT_PUBLIC_TENANT_ID` | Optional override when auth not yet wired |
| `FINCONNEX_TENANT_ID` | Server-side tenant override |

---

## 2. Logical keys (Lead Card surface)

Prefix at rest: `fc:{tenantId}:` via `tenantScopedKey()`.

| Logical key | Module |
|-------------|--------|
| `sales:leads:board:v6` | Leads Kanban / list |
| `sales:leads:activity-extras:v1` | Legacy extras (prefer module stores) |
| `activities:calls:board:v1` | Calls |
| `activities:meetings:list:v1` | Meetings |
| `activities:messages:list:v1` | Messages / SMS |
| `activities:emails:list:v1` | Emails |
| `activities:tasks:board:v2` | Tasks |
| `activities:notes:list:v1` | Notes |
| `activities:attachments:list:v1` | Attachments |
| `settings:values:v1` | Settings bag (includes Lead Card) |
| `settings:custom-fields:v1` | Custom field definitions |

---

## 3. HTTP contract (current stub)

`createApiDriver` expects a simple KV shape (replace with OpenAPI modules when ready):

| Method | Path | Body / response |
|--------|------|-----------------|
| `GET` | `/v1/kv/{scopedKey}` | `{ "value": "<json string>" }` |
| `PUT` | `/v1/kv/{scopedKey}` | `{ "value": "<json string>" }` |
| `DELETE` | `/v1/kv/{scopedKey}` | — |

Headers:

- `Authorization: Bearer <token>`
- `X-Tenant-Id: <tenantId>`
- `Content-Type: application/json`

**Phase 10 preferred:** replace KV with first-class REST (`/v1/leads`, `/v1/calls`, …) and thin adapters in each `store.ts` — keep UI call sites unchanged.

---

## 4. Multi-tenant rules

1. Never store unscoped keys in shared browsers.  
2. Switch tenant → call `setTenantContext` then rehydrate (or full reload).  
3. Custom fields + Lead Card settings are tenant-scoped like board data.  
4. Activity matching stays by `Lead: {name}` until stable lead IDs are on the API.

---

## 5. Cutover checklist (Phase 10)

Session 10 delivered: `bootstrapPersistence`, mock KV (`createMockKvBackend`),
module route map, `smoke:phase10`. Remaining for live backend:

- [ ] Auth supplies `tenantId` + access token  
- [ ] `bootstrapPersistence` / `enableApiPersistence` called once at bootstrap  
- [ ] Hydrate list matches `LEAD_CARD_HYDRATE_KEYS`  
- [ ] Write path verified (create call/note/attachment from Lead Card)  
- [ ] Attachment binary strategy decided (upload URL vs multipart)  
- [ ] Replace KV with module REST (`LEAD_CARD_MODULE_ROUTES`)  
- [ ] Session driver retained only for Storybook / offline demos  
- [x] Smokes: API-mode fixtures against mock KV (`smoke-session10`) 

---

## 6. Rollback

```ts
import { enableSessionPersistence } from "@/lib/persistence";

enableSessionPersistence();
// reload — demo seeds return
```
