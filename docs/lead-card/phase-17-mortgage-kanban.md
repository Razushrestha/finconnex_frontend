# Phase 17 — Mortgage pipeline Kanban (Option B)

Session 16 mapped SLA onto New / Contacted / Qualified. Session 17 makes the **Leads board columns the mortgage stages** from the SLA PDF so clocks and columns are 1:1.

## Columns

1. New Lead  
2. Appointment Booked  
3. In Conversation  
4. Waiting on Documents  
5. Documents Received  
6. Processing  
7. Settled *(final — cannot drag out)*  
8. Lost *(no SLA)*

## CRM bridge

`LeadStatus` remains for legacy APIs; create form uses mortgage **Pipeline stage**:

| Mortgage stage | LeadStatus |
|----------------|------------|
| New Lead, Appointment Booked | New |
| In Conversation | Contacted |
| Waiting on Documents, Documents Received, Processing | Qualified |
| Settled | Converted |
| Lost | Unqualified |

## Behaviour

- Drag → `pipelineStage` = column title; `stageEnteredAt` resets; `pipelineStartedAt` kept (except drag **into New Lead**, which restarts the pipeline)
- Board `normalizeMortgageBoard` always restores PDF stage order + `leadStatus` + card↔column stage sync
- Create form: Pipeline stage dropdown; column **+** deep-links `/sales/leads/create?stage=…`
- Card / list subtitle shows mortgage stage (not New/Contacted)
- Filters: Pipeline stage list
- Board store key: `sales:leads:board:v6`

## Verify

```bash
npm run typecheck
npm test
npm run smoke:phase17
```
