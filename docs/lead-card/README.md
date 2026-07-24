# Lead Card v3 docs

| Doc | Purpose |
|-----|---------|
| [phase-9-acceptance.md](./phase-9-acceptance.md) | Sign-off pack: a11y QA, product walk, exit criteria |
| [phase-13-closeout.md](./phase-13-closeout.md) | **Master close-out** — human walk + sign-off (Session 13) |
| [phase-10-cutover.md](./phase-10-cutover.md) | Session 10 adapter bootstrap + mock KV |
| [phase-14-cutover.md](./phase-14-cutover.md) | Session 14 auth bridge + module REST cutover |
| [phase-15-comms-files.md](./phase-15-comms-files.md) | Session 15 upload + send gateways |
| [phase-16-pipeline-sla.md](./phase-16-pipeline-sla.md) | Session 16 Stage + Milestone SLA |
| [phase-17-mortgage-kanban.md](./phase-17-mortgage-kanban.md) | Session 17 mortgage pipeline Kanban |
| [phase-18-sla-work-queue.md](./phase-18-sla-work-queue.md) | Session 18 Pipeline SLA Work Queue |
| [phase-11-polish.md](./phase-11-polish.md) | Session 11 spec polish (status/tags + document requested) |
| [phase-12-timeline.md](./phase-12-timeline.md) | Session 12 status timeline + a11y surface CI |
| [api-adapter-runbook.md](./api-adapter-runbook.md) | Multi-tenant persistence → live API cutover |

## Verify

```bash
npm run typecheck
npm test
npm run smoke:phase9
npm run smoke:phase14
npm run smoke:phase15
npm run smoke:phase16
npm run smoke:phase17
npm run smoke:phase18
```
