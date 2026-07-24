# Lead Card — Phase 14 / Session 14 cutover

**Status:** Cutover scaffolded (auth bridge + module REST). Staging CRM still external.

---

## Delivered

| Piece | Location |
|-------|----------|
| CRM token route | `src/app/api/auth/crm-token/route.ts` |
| Auth bridge | `src/lib/persistence/auth-bridge.ts` |
| Cutover runner | `src/lib/persistence/cutover.ts` → `runLiveApiCutover` |
| Module client | `src/lib/persistence/module-client.ts` |
| Mock module API | `src/lib/persistence/mock-module-api.ts` |
| App mount | `PersistenceBootstrap` calls `runLiveApiCutover` |
| Contracts | `src/lib/leads/phase-14.ts` |

---

## Flow after login

```
/api/auth/me  →  tenantId
/api/auth/crm-token  →  accessToken (session JWT)
runLiveApiCutover()
  → setTenantContext(tenantId)
  → enableApiPersistence (if NEXT_PUBLIC_CRM_API_URL)
  → GET /v1/leads, /v1/calls, … (LEAD_CARD_MODULE_ROUTES)
  → seedCache(logicalKey, value)
```

Without `NEXT_PUBLIC_CRM_API_URL`, cutover stays on the **session** driver with the auth tenant id.

---

## Staging checklist

- [ ] Log in so `/api/auth/me` returns tenant id  
- [ ] Set `NEXT_PUBLIC_CRM_API_URL` to staging CRM origin  
- [ ] Confirm `X-Tenant-Id` + Bearer on module GETs  
- [ ] Module collections honour hydrate keys / `{ value }` shape  
- [ ] Lead Card loads hydrated data after login  
- [ ] Write path verified (create call/note from card)  

---

## Next

**Phase 15** — binary attachment upload + true Call/SMS/Email send gateways.

---

## Verify

```bash
npm run typecheck
npm test
npm run smoke:phase14
```
