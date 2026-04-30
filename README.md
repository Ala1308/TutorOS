# TutorOS AI

Internal operating system for a tutoring company. One operator runs the company
with AI agents handling drafting, analysis, and proposed next steps; the
operator decides what ships. **Control tower, not autopilot.**

The full architecture, conventions, and rules live in
[`CONTRIBUTING.md`](./CONTRIBUTING.md). That document is the single source of
truth — read it before changing code.

---

## Stack

- **Next.js 15** (App Router, RSC by default)
- **TypeScript** strict mode
- **Tailwind CSS** + shadcn/ui-style primitives
- **Supabase Postgres** + **Drizzle ORM** with RLS
- **Supabase Auth** (magic link)
- **Zod** for validation across forms / actions / agents / JSON columns
- **Vercel AI SDK** with structured output (`generateObject`)
- **Inngest** for all async workflows
- **Langfuse** for tracing every model call
- **Google Workspace** (Drive / Gmail / Calendar / Meet) per-user OAuth
- **Pluggable voice provider** (vapi / elevenlabs / bland / retell / synthflow / lindy / none)

## First-time setup

```bash
# 1. Install
npm install

# 2. Link the Supabase project (one-time, already done in this repo)
supabase link --project-ref <your-project-ref>

# 3. Configure env (Supabase URL + keys, AI keys, etc.)
cp .env.example .env.local
# Fill in:
#   - DATABASE_URL / DIRECT_URL (Supabase dashboard → Settings → Database)
#   - SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
#   - any LLM / Inngest / Google keys you want active

# 4. Apply schema (Drizzle is the source of truth, Supabase CLI applies it)
npm run db:generate                      # diffs schema → drizzle/<n>.sql
# Stage as a Supabase migration (manual one-time per drizzle migration):
#   cp drizzle/<n>.sql supabase/migrations/<timestamp>_<name>.sql
supabase db push                         # apply to remote
npm run db:types                         # regenerate Supabase TS types

# 5. Bootstrap the first OWNER user (sends a magic link to the email)
npm run seed:owner -- you@example.com "Your Full Name"

# 6. Run dev
npm run dev
```

## Modular layout

```text
app/                Next.js routes (auth, public, app shell, api)
components/         UI primitives + feature components
lib/
  env.ts            Zod-validated env (never read process.env directly)
  logger.ts         Structured pino logger
  auth/             Supabase wrapper, requireAuth, permissions, RLS
  db/               Drizzle client, one schema file per domain, queries, mutations
  ai/
    client.ts       Provider-agnostic LLM client
    traced.ts       Langfuse tracing wrapper
    runAgent.ts     The single entry point for any agent execution
    registry.ts     Agent definitions registered here
    toolRegistry.ts Tool definitions registered here
    budget.ts       Per-agent and global cost caps
    agents/         <name>.ts per agent (see Appendix B)
    prompts/        _system, _safety, then per-agent
    schemas/        _base.ts + per-agent input/output
    tools/          <category>.ts grouping <entity>.<verb> tools
    evals/          <agent>.eval.ts fixtures
  schemas/          Zod schemas reused across forms / actions / DB JSON cols
  services/         Domain logic. Routes/agents/tools/workflows call services.
  google/           OAuth client + Drive / Gmail / Calendar wrappers
  voice/            Pluggable provider adapter
  inngest/          Client, events registry, function exports
  workflows/        One file per domain workflow
  matching/         Pure functions — tutor/student matching
  finance/          Pure functions — invoices, payouts, taxes
  curriculum/       Pure functions — exercise/question templates
  utils/            money, dates, redact, errors, cn
drizzle/            Generated migrations (committed)
scripts/            db setup, eval runner, etc.
tests/              unit / integration / e2e
docs/               Long-form architecture + phase docs
```

## How the architecture stays "easily editable"

Every system in `CONTRIBUTING.md` has a **single, named home** and a typed contract:

| System                   | Home                             | How to extend                                                   |
| ------------------------ | -------------------------------- | --------------------------------------------------------------- |
| Add a new entity         | `lib/db/schema/<entity>.ts`      | Re-export from `schema/index.ts`, run `npm run db:generate`     |
| Add a new agent          | `lib/ai/agents/<name>.ts`        | + prompt + schema + eval. Register in `lib/ai/registry.ts`      |
| Add a new tool           | `lib/ai/tools/<category>.ts`     | Register in `lib/ai/toolRegistry.ts`                            |
| Add a new workflow step  | `lib/workflows/<domain>.ts`      | Add event to `lib/inngest/events.ts`                            |
| Add a new automation key | `lib/services/automationService` | Add a `<domain>.<step>` constant; default is `DRAFT_ONLY`       |
| Add a new approval kind  | `lib/services/approvalService`   | Pass `proposedAction` + payload schema                          |
| Add a new voice provider | `lib/voice/<provider>.ts`        | Implement `VoiceProviderAdapter`; register in `lib/voice/index` |

## Reference implementation

The **leads** domain is wired end-to-end as the canonical example:

- Schema: `lib/db/schema/leads.ts`
- Service: `lib/services/leadService.ts`
- Agent: `lib/ai/agents/leadScoring.ts` (+ prompt / schema / eval)
- Tool: `lib/ai/tools/lead.ts`
- Workflow: `lib/workflows/leads.ts`
- UI: `app/(app)/leads/`

Use it as the template when adding parents, students, sessions, etc.

## Commands

| Command                                  | What it does                                |
| ---------------------------------------- | ------------------------------------------- |
| `npm run dev`                            | Next dev server                             |
| `npm run typecheck`                      | `tsc --noEmit`                              |
| `npm run lint`                           | ESLint                                      |
| `npm run format`                         | Prettier write                              |
| `npm run db:generate`                    | Generate Drizzle migration from schema diff |
| `npm run db:push`                        | Push schema to dev DB (no migration)        |
| `npm run db:migrate`                     | Apply Drizzle migrations                    |
| `npm run db:studio`                      | Drizzle Studio                              |
| `npm run db:types`                       | Regenerate `lib/db/supabase-types.ts`       |
| `supabase db push`                       | Apply Supabase migrations to remote project |
| `npm run seed:owner -- <email> "<name>"` | Bootstrap first OWNER user                  |
| `npm test`                               | Vitest                                      |
| `npm run eval -- <agent>`                | Run an agent's eval fixtures                |
| `npm run inngest:dev`                    | Inngest dev server                          |
