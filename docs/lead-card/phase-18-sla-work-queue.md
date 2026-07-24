# Phase 18 — Pipeline SLA Work Queue

Sessions 16–17 put Stage + Milestone clocks on every Lead Card and made Kanban columns match mortgage stages. Session 18 makes those clocks **actionable** in Work Queue.

## Where

**Work Queue → Pipeline SLA**

| Sidebar item | Shows |
|--------------|--------|
| Needs attention | All actionable bands, ranked |
| Overdue | Stage/overall **Overdue** |
| Milestone Overdue | **Milestone Overdue** only |
| Due Today | **Due Today** |
| At Risk | **At Risk** |

Excluded: On Track, No SLA (Settled / Lost).

## Ranking

1. Overdue  
2. Milestone Overdue  
3. Due Today  
4. At Risk  

Then soonest due within the same band.

## Behaviour

- Scoped by the Work Queue **user tab** (owner)
- Status column = SLA badge label; Due = primary clock detail
- Related = mortgage stage · company
- Row → `/sales/leads?focus={id}&q={name}`
- Queue category storage key: `finconnex:workqueue:categories:v2`

## Seeds (now = 2026-07-23 12:00)

| Lead | Band | Typical owner tab |
|------|------|-------------------|
| Jennifer Adams | Overdue | John Smith |
| Arjun Mehta | Milestone Overdue | Tejas Gokhe |
| Chloe Ramirez | Due Today | Shiva Kadhka |
| Jamie Cole | At Risk | John Smith |
| William Anderson | On Track *(not listed)* | John Smith |

## Verify

```bash
npm run typecheck
npm test
npm run smoke:phase18
```
