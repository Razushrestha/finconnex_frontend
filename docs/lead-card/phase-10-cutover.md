# Lead Card — Phase 10 / Session 10 cutover

**Status:** Adapter ready (mock + bootstrap). Live CRM backend still external.

---

## What Session 10 shipped

| Piece | Location |
|-------|----------|
| Bootstrap | `src/lib/persistence/bootstrap.ts` |
| App mount | `src/components/persistence/PersistenceBootstrap.tsx` |
| Mock KV | `src/lib/persistence/mock-kv.ts` |
| Module REST map | `src/lib/persistence/module-routes.ts` |
| Contracts | `src/lib/leads/phase-10.ts` |
| Smoke | `src/lib/leads/smoke-session10.ts` |

---

## Flip to API mode

1. Set `NEXT_PUBLIC_CRM_API_URL` (e.g. `https://api.finconnex.app`).
2. Optionally set `NEXT_PUBLIC_TENANT_ID` until auth wires `orgId`.
3. After login, prefer explicit bootstrap:

```ts
await bootstrapPersistence({
  mode: "api",
  baseUrl: process.env.NEXT_PUBLIC_CRM_API_URL!,
  tenantId: session.orgId,
  getAccessToken: () => session.accessToken,
});
```

`PersistenceBootstrap` already calls `bootstrapPersistence({ mode: "auto" })` so env alone enables API mode.

---

## Cutover checklist

- [ ] Auth supplies orgId + access token to bootstrap
- [ ] `NEXT_PUBLIC_CRM_API_URL` points at live CRM origin
- [ ] KV or module APIs honour `X-Tenant-Id` + Bearer
- [ ] Hydrate `LEAD_CARD_HYDRATE_KEYS` after login before Lead Card mount
- [ ] Replace KV with module REST adapters per `LEAD_CARD_MODULE_ROUTES`
- [ ] Attachment binary upload (multipart) outside JSON KV
- [ ] True Call/SMS/Email send gateways

---

## Verify

```bash
npm run typecheck
npm test
npm run smoke:phase10
```

See also [api-adapter-runbook.md](./api-adapter-runbook.md).
