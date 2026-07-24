# Lead Card — Phase 13 / Session 13 close-out

**Status:** Awaiting human sign-off  
**Code:** Sessions 1–12 complete · automated gates green via `npm test` / `smoke:phase13`

This pack closes **Lead Card v3** for demo/staging. It does **not** implement live CRM APIs.

Primary sign-off tables also live in [phase-9-acceptance.md](./phase-9-acceptance.md).

---

## 13.1 Automated gates (CI / local)

Run before asking humans to walk the UI:

```bash
npm run typecheck
npm test
npm run smoke:phase9
npm run smoke:phase12
npm run smoke:phase13
```

| Gate | Pass? |
|------|-------|
| `npm run typecheck` | |
| `npm test` (sessions 1–13 + hardening) | |
| `npm run smoke:phase9` | |
| `npm run smoke:phase12` | |
| CI workflow present (`.github/workflows/ci.yml`) | ✓ in repo |
| Confirm Actions green on a real remote PR | |

---

## 13.2 Human a11y (from Phase 9)

Source: `LEAD_CARD_A11Y_CHECKLIST` · full table in [phase-9-acceptance.md](./phase-9-acceptance.md#91-manual-a11y-qa).

- [ ] Kanban keyboard + screen reader walk complete  
- [ ] List keyboard + screen reader walk complete  

---

## 13.3 Product walk — Phase 9 core

Source: `LEAD_CARD_PRODUCT_WALK` · table in [phase-9-acceptance.md](./phase-9-acceptance.md#92-product-walk).

- [ ] All 10 Phase 9 product walk steps passed  

### Locked decisions (confirm)

| Decision | Value | OK? |
|----------|--------|-----|
| Unreplied threshold | 24h (admin-adjustable) | |
| Owner avatar | Off by default | |
| Note / Attachment | Forever neutral | |
| Escalation / push | Off | |
| Call / SMS / Email green | Never | |

---

## 13.4 Extended walk — Sessions 11–12

| # | Step | Pass? |
|---|------|-------|
| 1 | Lead Card settings: Pipeline / Stage and Tags selectable (max 4 fields) | |
| 2 | William card shows tags when Tags selected (Refinance, Hot) | |
| 3 | Document request appears as Last Activity label Document requested when newest | |
| 4 | Drag a lead across Kanban columns → Last Activity shows Status changed after refresh | |
| 5 | Katherina seed history includes Status New → Contacted in activity index | |
| 6 | Click Last Activity on a status event deep-links toward `/sales/leads` | |
| 7 | Document request Last Activity deep-links to `/documents/requests` | |

---

## 13.5 Defects

- [ ] No open P0/P1 Lead Card defects from the walkthrough  

| ID | Severity | Summary | Status |
|----|----------|---------|--------|
| | | | |

---

## 13.6 Sign-off

When 13.1–13.5 are done, fill this table **and** the one in phase-9-acceptance.md:

| Role | Name | Date | Notes |
|------|------|------|-------|
| Product | | | |
| Engineering | | | |
| QA / a11y | | | |

**Accepted means:** Lead Card v3 is approved for demo / staging.

---

## 13.7 Next after accept

| Phase | Title | When |
|-------|--------|------|
| **Phase 14** | Live API cutover | Backend auth + module APIs |
| **Phase 15** | Comms + files production | Binary upload + send gateways |

See [phase-10-cutover.md](./phase-10-cutover.md) and [api-adapter-runbook.md](./api-adapter-runbook.md).

---

## Commands

```bash
npm run smoke:phase13
```
