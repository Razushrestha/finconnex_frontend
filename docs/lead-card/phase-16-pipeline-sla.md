# Phase 16 — Pipeline Stage + Milestone SLA

Session 16 adds mortgage **Stage SLA** and **Milestone SLA** clocks from the pipeline SLA infographic. These sit **beside** Lead Card Activity Summary urgency — they do not replace it.

## Clocks

| Clock | Resets | Meaning |
|-------|--------|---------|
| Stage SLA | On pipeline stage change | Time allowed in the current stage |
| Milestone SLA | Only when target stage is reached | Time from pipeline start → target stage |

Bands: **On Track** · **Due Today** (due calendar day) · **At Risk** (due tomorrow) · **Overdue** · **Milestone Overdue** (milestone overdue while stage is not). Sub-day stage clocks (e.g. 30 minutes) stay On Track until they expire.

Lost / Settled terminal stages have no stage SLA (`No SLA` — chip hidden).

## Admin

**Settings → CRM Configuration → Pipelines** (`/settings/crm-configuration/pipelines`)

- Stage duration table (minutes / hours / days)
- Milestone table (start → target + duration)
- Reset defaults restores the mortgage PDF seed

## Lead Card / List

Matches the SLA PDF card examples:

- **Top-right badge:** On Track · Due Today · At Risk · Overdue · Milestone Overdue
- **SLA panel:** Stage Due (clock) + `Milestone: {target} ({duration})` (target icon)
- Each clock row is colored by **its own** band (Sarah: green stage + red milestone)
- Due stamp + remaining / overdue text on each row
- **List:** Pipeline SLA column with badge + primary clock detail
- Activity Summary + Last Activity + quick actions unchanged (separate urgency system)

## Kanban bridge (Option A)

Current board columns remain Lead statuses. Mapping:

| Lead status | Mortgage stage |
|-------------|----------------|
| New | New Lead |
| Contacted | In Conversation |
| Qualified | Waiting on Documents |
| Converted | Settled |
| Unqualified | Lost |

Cards may override with `pipelineStage` for demo seeds. On drag, `pipelineStage` is set from the map, `stageEnteredAt` resets, `pipelineStartedAt` is kept.

## Seeds (now = 2026-07-23 12:00)

| Lead | Badge |
|------|--------|
| William Anderson | On Track (In Conversation clocks) |
| Chloe Ramirez | Due Today |
| Jennifer Adams | Overdue |
| Arjun Mehta | Milestone Overdue |

## Verify

```bash
npm run typecheck
npm test
npm run smoke:phase16
```
