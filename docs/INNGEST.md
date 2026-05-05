# Inngest Workflows

Inngest is the durable workflow engine for everything that runs **outside the
HTTP request/response cycle** — async fan-out, scheduled work, retries,
long-running flows that pause for human approval, and steps that need to
survive a process restart.

Per `CONTRIBUTING.md` §17, all workflows live under `lib/workflows/<domain>.ts`
and every event has a Zod schema in `lib/inngest/events.ts`. The Next.js route
at `app/api/inngest/route.ts` is the single endpoint that registers them.

---

## Local development setup

You need **two terminals** running side by side:

```bash
# terminal 1 — Next dev server (registers /api/inngest)
npm run dev

# terminal 2 — Inngest dev server (UI at http://localhost:8288)
npm run inngest:dev
```

The `inngest:dev` script runs `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`.
On first run it downloads the CLI binary; subsequent runs are instant.

Once both are up:

- **Inngest UI**: <http://localhost:8288> — see registered functions, sent
  events, run history, replays, and queue inspection.
- **Functions tab**: should list `tutoros-ai/on-lead-created`. If empty, your
  Next dev server isn't reachable at the `-u` URL above (check the path).
- **Events tab**: every `inngest.send(...)` call in the app shows up here in
  real time, with payloads.

---

## Event registry

All event names are typed in `lib/inngest/events.ts` and surface as
`EventName` for compile-time safety. To add an event:

1. Add `"<dot.case.name>": { data: z.object({ ... }) }` to `eventSchemas`.
2. Send it from a service / action via `inngest.send({ name, data })`.
3. Subscribe with `inngest.createFunction(..., { event: "<name>" }, ...)` in
   `lib/workflows/<domain>.ts`.
4. Re-export the function from `lib/inngest/functions.ts` so the route picks
   it up.

Today's registry:

| Event                         | Sender                                       | Subscriber                             |
| ----------------------------- | -------------------------------------------- | -------------------------------------- |
| `lead.created`                | `app/(app)/leads/actions.ts` + public intake | `lib/workflows/leads.ts:onLeadCreated` |
| `lead.qualified`              | `lib/workflows/leads.ts` (when score ≥ 70)   | (none yet)                             |
| `intake.submitted`            | (TBD intake form route)                      | (TBD)                                  |
| `assessment.generated`        | (TBD assessment service)                     | (TBD)                                  |
| `assessment.submitted`        | (TBD)                                        | (TBD)                                  |
| `session.scheduled`           | (TBD session service)                        | (TBD)                                  |
| `session.completed`           | (TBD)                                        | (TBD)                                  |
| `session.transcript_imported` | (TBD)                                        | (TBD)                                  |
| `approval.approved`           | `app/(app)/approvals/actions.ts`             | any waiting workflow                   |
| `approval.rejected`           | `app/(app)/approvals/actions.ts`             | any waiting workflow                   |
| `approval.changes_requested`  | `app/(app)/approvals/actions.ts`             | any waiting workflow                   |
| `agent.run.completed`         | (reserved — runAgent emits later)            | (TBD)                                  |
| `daily.tick`                  | (cron)                                       | (TBD)                                  |

---

## Workflow lifecycle: `onLeadCreated`

This is the canonical example. Every other workflow should follow the same
shape.

```
[lead.created] (sent from createLeadAction or public intake route)
       │
       ▼
load-system-automation-mode
       │
       ▼  if MANUAL → return { status: "skipped" }
       │
       ▼
run-lead-scoring  (delegates to leadScoringService.runForLead)
       │
       ├──── decision.kind === "APPLY"
       │         │
       │         ▼
       │     emit-lead-qualified (if score ≥ 70)
       │         │
       │         ▼ done
       │
       └──── decision.kind === "APPROVAL"
                 │
                 ▼
             wait-for-approval  (event: approval.approved, timeout: 7d, if leadId match)
                 │
                 ├── timeout → return { status: "approval_timeout" }
                 │
                 ▼
             reload-lead-after-approval (score is now applied)
                 │
                 ▼
             emit-lead-qualified (if score ≥ 70)
                 │
                 ▼ done
```

**Why the workflow doesn't apply the score itself:** `leadScoringService.runForLead`
is the single source of truth that decides APPLY vs APPROVAL based on the
agent's confidence + risk + automation mode. The workflow is just a
durable wrapper that handles the "wait for the human" part.

---

## Workflow rules (CONTRIBUTING.md §17)

1. **Every step is named.** `step.run("name", fn)` — names are how Inngest
   identifies retry boundaries. Renaming a step in production will replay
   any in-flight workflow from that step.
2. **Each step is small and idempotent.** Re-running a step (because of
   retry) must not double-write. Lean on services that already audit /
   are transactional (`leadScoringService`, `approvalService`, etc).
3. **Pure JS branching uses `step.run`.** The workflow body itself is
   replayed from the start on retry; only `step.run` results are memoised.
   Wrap any call with side-effects (DB write, LLM call, external API) in
   `step.run`.
4. **Approvals use `step.waitForEvent`.** Match on `event.data.<idField>`
   so the right workflow run resumes for the right entity.
5. **Long-form async = workflow, not server action.** If a request would
   take longer than ~5 seconds, send the event from the action and let
   Inngest handle the rest.

---

## How approval-resolution drives workflows

When a human clicks **Approve** in `/approvals`:

```
resolveApprovalAction
  │
  ▼
approvalService.resolve (txn) — sets status=APPROVED, audits
  │
  ▼
applyApprovedProposal (dispatcher) — applies the proposed action to the entity
  │
  ▼
inngest.send({ name: "approval.approved", data: { approvalId } })   ← un-blocks workflow
  │
  ▼
revalidatePath(...) — UI updates
```

The Inngest send is **best-effort**: a failure logs a warning but does not
roll back the human decision. If a workflow stalls, you can replay it from
the Inngest UI (Functions → run → Rerun).

---

## Troubleshooting

### "I sent an event but the workflow never runs"

1. Check the Inngest UI's **Events tab** — did the event arrive?
2. Check the **Functions tab** — is `tutoros-ai/on-lead-created` registered?
   If not, the dev server can't reach `/api/inngest`. Make sure `npm run dev`
   is running and accepting requests on port 3000.
3. Check the function's **Run history**. Look for an error in the latest run
   — common causes: env var missing (`ANTHROPIC_API_KEY`), DB connection
   failure, schema mismatch in event payload.

### "Workflow waits forever after approval"

1. Check that the approval was actually resolved: the row in
   `approval_requests` should have `status='APPROVED'` and `reviewed_at`
   set.
2. Check the server logs around the `resolveApprovalAction` call for the
   "Failed to emit inngest approval event" warning.
3. In Inngest UI → run history → look at the `wait-for-approval` step —
   the `if` condition is `event.data.approvalId == "<id>"`. If the
   approvalId in the event doesn't match, the wait won't resolve.

### "I changed an event's schema and old workflows are failing"

Schemas in `lib/inngest/events.ts` are validated when an event is sent.
Old in-flight runs were started against the old schema and live in
Inngest's queue. Either:

- Replay them with payloads that conform to the new schema (UI → Replay),
  or
- Drain by waiting for them to time out, or
- Add a migration step that translates the old payload shape to the new
  one before reading `event.data`.

---

## Production setup

Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in your hosting platform's
env. The Next.js route at `app/api/inngest/route.ts` will use them
automatically. The Inngest cloud dashboard auto-discovers your functions
on next deploy.

If you don't set those keys, `inngest.send(...)` is a no-op in production —
which is the right default if you haven't connected Inngest yet, and
catastrophic if you forgot to. Add the env keys to the deploy checklist.
