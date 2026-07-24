# Lead Card — Phase 11 / Session 11 polish

Closes remaining **spec v3 §4 / §6** example gaps after Sessions 1–10.

**Status:** Spec polish complete (automated). Phase 9 human sign-off is still separate.

---

## Delivered

| Item | Spec | Implementation |
|------|------|----------------|
| Pipeline / Stage field | §4 | `status` in `LEAD_CARD_FIELD_OPTIONS` → card value from column status |
| Tags field | §4 | `tags?: string[]` on lead card/record; seeded William + Chloe |
| Document requested | §6 | `fromDocumentRequests` in activity index; Last Activity label |
| Deep-link | — | `sourceModule: "documents"` → `/documents/requests` |

---

## Still out of scope

- Manual Phase 9 a11y / product sign-off (`phase-9-acceptance.md`)
- Live CRM adapters cutover (`phase-10-cutover.md`)
- Escalation / push / binary upload / send gateways

---

## Verify

```bash
npm run typecheck
npm test
npm run smoke:phase11
```

Settings → CRM Configuration → Lead Card: pick **Pipeline / Stage** and/or **Tags** (max 4 fields).
