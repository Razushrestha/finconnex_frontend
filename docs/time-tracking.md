# Time tracking

Billable-hours tracking for professional-services work (accounting, legal, agencies) where invoices are based on time rather than a fixed fee.

The screen is [http://localhost:3000/time-tracking](http://localhost:3000/time-tracking).

## Fields

| Field | Meaning |
| --- | --- |
| Time Entry ID | Human id such as `TE-0001` (`entryCode` on the API) |
| Related To | Matter, Deal, Ticket, or Project |
| User | Workspace member who did the work |
| Date | Work date |
| Duration | Hours and minutes, stored as minutes |
| Billable | Yes or No |
| Rate | Hourly rate |
| Description | What the time was for |

Amount is duration × rate when the entry is billable.

## Actions

| Action | What it does |
| --- | --- |
| Start / Stop timer | Opens one running timer for the signed-in user, then writes the duration when it stops |
| Log time manually | Creates a stopped entry with an explicit duration (`/time-tracking/create`) |
| Mark billable / non-billable | Updates `isBillable` on an entry that is not yet invoiced |
| Approve time entries | Logged or submitted rows become Approved |
| Generate invoice | Approved billable rows become one CRM invoice and are marked Invoiced |
| Filter / search | Status, user, related kind, billable, date, and text search |
| Export timesheet | Downloads the filtered rows as CSV |

## Status

`Draft` → `Running` → `Logged` → `Submitted` → `Approved` → `Invoiced`

`Rejected` sends a submitted entry back for edits. A running timer is `Running` until it is stopped, which logs it.

## API

All routes are workspace-scoped under `/v1` and need `timesheet.manage` to write or `timesheet.read` to list.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/time-entries` | List. Query: `search`, `userId`, `relatedKind`, `workflowStatus`, `isBillable`, `workDate`, `page`, `limit` |
| `POST` | `/v1/time-entries/timer/start` | Start a timer |
| `POST` | `/v1/time-entries/:id/timer/stop` | Stop a timer and store duration |
| `POST` | `/v1/time-entries` | Log time manually (`durationMinutes` required) |
| `PATCH` | `/v1/time-entries/:id` | Update description, duration, billable flag, rate, or related record |
| `POST` | `/v1/time-entries/approve` | Body `{ "entryIds": ["..."] }` |
| `POST` | `/v1/time-entries/invoice` | Invoice approved billable entries. Body `{ "entryIds": ["..."] }` |

`relatedKind` is `MATTER`, `DEAL`, `TICKET`, or `PROJECT`. A deal can also set `dealId`.

Timesheet submit / approve / lock remains available at `/v1/timesheets` when a period needs a manager sign-off before the older locked-timesheet invoice path.

## Database

Migration `20261005140000_time_entry_professional_services` adds `entry_code`, `related_kind`, `related_id`, `related_name`, `work_date`, and `workflow_status` on `time_entries`.

Apply it from `multi-crm-backend-main`:

```bash
npx prisma migrate deploy
```

Until that migration runs, the time tracking page keeps working from the browser store and shows the CRM as offline.
