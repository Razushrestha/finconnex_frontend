# Lead Card — Phase 15 / Session 15

**Status:** Comms + files scaffolded. Vendor ESP/CDN still external.

---

## Delivered

| Piece | Location |
|-------|----------|
| Upload adapters | `src/lib/attachments/upload.ts` |
| Send gateways | `src/lib/comms/send-gateway.ts` |
| Env flip | `src/lib/comms/production.ts` → `enableProductionComms` |
| UI wiring | `LeadQuickActionDialog` + `submitLeadQuickAction` |
| App mount | `PersistenceBootstrap` runs cutover then production comms |

---

## Modes

| | Demo (default) | Production (`NEXT_PUBLIC_CRM_API_URL`) |
|--|----------------|----------------------------------------|
| Upload | `local://attachments/...` | `POST /v1/attachments/upload` |
| Call / SMS / Email | `tel:` / `sms:` / `mailto:` | `/v1/calls/initiate`, `/v1/messages/send`, `/v1/emails/send` |

---

## Staging checklist

- [ ] CRM URL set → uploadMode `api`, sendMode `api`  
- [ ] Upload returns `storageUrl`  
- [ ] Send endpoints honour tenant + Bearer  
- [ ] Attachment quick action persists `storageUrl`  
- [ ] Intent buttons use gateway in api mode  

---

## Verify

```bash
npm run typecheck
npm test
npm run smoke:phase15
```
