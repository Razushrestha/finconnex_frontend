# Phase 9 — Acceptance & Production Ready

**Status:** Ready for acceptance  
**Scope:** Lead Card v3 (Kanban + List + Settings + activity modules)  
**Not in scope:** Live API, binary uploads, messaging gateway, escalation/push

Feature implementation (Sessions 1–12) is complete. Phase 9 defines the human QA tables; **Phase 13** is the close-out pack that consolidates sign-off — see [phase-13-closeout.md](./phase-13-closeout.md).

---

## Exit criteria

- [ ] Manual a11y checklist walked on Kanban **and** List (keyboard + screen reader)
- [ ] Product walk signed; locked product decisions accepted for v1
- [ ] `npm test` + `npx tsc --noEmit` green; `.github/workflows/ci.yml` present
- [ ] [API adapter runbook](./api-adapter-runbook.md) reviewed
- [ ] No open P0/P1 Lead Card defects from the walkthrough

**Sign-off**

| Role | Name | Date | Notes |
|------|------|------|-------|
| Product | | | |
| Engineering | | | |
| QA / a11y | | | |

---

## 9.1 Manual a11y QA

Source of truth: `LEAD_CARD_A11Y_CHECKLIST` in `src/lib/leads/a11y-urgency.ts`.

**Surfaces:** Sales → Leads (Kanban) and List toggle. Use a keyboard and a screen reader (NVDA / VoiceOver / JAWS).

| # | Check | Kanban | List | Pass? |
|---|--------|--------|------|-------|
| 1 | Tab reaches Activity Summary, Last Activity, and all 7 quick actions | | | |
| 2 | Enter/Space activates summary, last activity, and each quick action | | | |
| 3 | Focus rings visible (ring-2) on interactive card controls | | | |
| 4 | Activity Summary aria-label includes urgency words (not color-only) | | | |
| 5 | Quick action aria-label includes state words + pending count | | | |
| 6 | Dialog has DialogTitle + DialogDescription (sr-only ok) | | | |
| 7 | Red/amber/green surfaces meet WCAG AA (≥4.5:1) for summary text | | | |
| 8 | Badge white-on-urgency meets WCAG AA (≥4.5:1) for badge numerals | | | |
| 9 | Drag handle / card drag does not trap keyboard focus | | | N/A list |
| 10 | List view exposes the same toolbar semantics as the Kanban card | N/A | | |

**Contrast (automated):** `npm test` → Session 8 / `assertUrgencyContrastAa()`.

---

## 9.2 Product walk

Source of truth: `LEAD_CARD_PRODUCT_WALK` in `src/lib/leads/phase-9.ts`.

| # | Step | Pass? |
|---|------|-------|
| 1 | Sales → Leads Kanban: Activity Summary opens pending panel | |
| 2 | Last Activity opens timeline; note + attachment appear as completed | |
| 3 | All 7 quick actions open the correct dialog / form | |
| 4 | Call / SMS / Email: device intent works when phone/email present | |
| 5 | Call / SMS / Email: Log as sent / Log call writes to activity modules | |
| 6 | Attachment quick action appears under Activities → Attachments | |
| 7 | Settings → Custom Fields: active Lead fields show in Lead Card picker | |
| 8 | Lead Card settings: select cf:* field; value shows on seeded William card | |
| 9 | Leads list view: same summary urgency, last activity, and 7 actions | |
| 10 | Confirm locked defaults: owner avatar off, unreplied 24h, note/attach neutral | |

### Locked v1 product decisions

| Decision | Value |
|----------|--------|
| Unreplied SMS/email threshold | **24 hours** (admin-adjustable) |
| Owner avatar on card | **Off** by default |
| Note / Attachment quick actions | **Forever neutral** (no urgency/badge) |
| Escalation from card | **Off** |
| Push from card | **Off** |
| Call / SMS / Email green | **Never** |

---

## 9.3 Engineering housekeeping

- [x] Stale “future session” comments refreshed in Lead Card modules
- [x] Session 9 smoke + Vitest coverage (`runSmokeSession9`)
- [x] CI workflow: `.github/workflows/ci.yml` (typecheck, lint, test)
- [ ] Confirm Actions green on a real PR/push to the remote

---

## 9.4 API readiness

See [API adapter runbook](./api-adapter-runbook.md). Phase 9 does **not** require a live backend. Doc index: [README.md](./README.md).

---

## 9.5 Phase complete → next

When exit criteria are checked and signed (use [Phase 13 close-out](./phase-13-closeout.md) as the master checklist):

> **Lead Card v3 = Accepted** for demo / staging.

**Next after accept**

| Phase | Title | When |
|-------|--------|------|
| 14 | Live API cutover | Backend auth + module APIs |
| 15 | Comms + files production | Binary upload + send gateways |

Adapter scaffolding already exists (Session 10); see [phase-10-cutover.md](./phase-10-cutover.md).

---

## Commands

```bash
npm run typecheck
npm test
npm run smoke
npm run smoke:phase9
npm run smoke:phase13
```

CI lints the Lead Card surface (`src/lib/leads`, persistence, list/card UI) — not the whole legacy eslint backlog.
