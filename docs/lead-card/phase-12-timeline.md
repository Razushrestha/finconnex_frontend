# Lead Card — Phase 12 / Session 12

**Status:** Timeline complete (automated).  
**Focus:** Spec §6 Status changed + CI a11y surface gates.

---

## Delivered

| Item | Detail |
|------|--------|
| Status → Last Activity | `statusHistoryToCandidates` reads `sales.leads` audit `status_change` |
| Demo seeds | Katherina New→Contacted; William Contacted→New (older than other events) |
| Live drag | Kanban `logStatusChange` + `emitLeadActivityChange` refreshes cards |
| Deep-links | `leads` → `/sales/leads`, `documents` → `/documents/requests` |
| Work Queue | HREF map includes documents |
| A11y surface | `assertLeadCardA11ySurface` gates LeadCard / List / panels |

---

## Product walk (Phase 12)

- Drag a lead across Kanban columns → Last Activity shows Status changed after refresh
- Katherina seed history includes Status New → Contacted in activity index
- Click Last Activity on a status event deep-links toward `/sales/leads`
- Document request Last Activity deep-links to `/documents/requests`

---

## Still manual

Phase 9 keyboard/screen-reader sign-off in [phase-9-acceptance.md](./phase-9-acceptance.md).

---

## Verify

```bash
npm run typecheck
npm test
npm run smoke:phase12
```
