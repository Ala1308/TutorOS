import { z } from "zod";

/**
 * All Inngest event types live here. Adding an event means:
 *   1. Register it below.
 *   2. Send it via `inngest.send({ name, data })` from a service.
 *   3. Subscribe with `inngest.createFunction(..., { event }, ...)`.
 *
 * Workflow steps wait for events with `step.waitForEvent`.
 *
 * Shape follows Inngest's `EventSchemas.fromZod({ "name": { data: z.object({...}) } })`.
 */
export const eventSchemas = {
  "lead.created": { data: z.object({ leadId: z.string().uuid() }) },
  "lead.qualified": {
    data: z.object({ leadId: z.string().uuid(), score: z.number() }),
  },
  "intake.submitted": { data: z.object({ intakeFormId: z.string() }) },
  "assessment.generated": { data: z.object({ assessmentId: z.string() }) },
  "assessment.submitted": { data: z.object({ assessmentId: z.string() }) },
  "session.scheduled": { data: z.object({ sessionId: z.string() }) },
  "session.completed": { data: z.object({ sessionId: z.string() }) },
  "session.transcript_imported": { data: z.object({ sessionId: z.string() }) },
  "approval.approved": { data: z.object({ approvalId: z.string().uuid() }) },
  "approval.rejected": { data: z.object({ approvalId: z.string().uuid() }) },
  "approval.changes_requested": {
    data: z.object({ approvalId: z.string().uuid() }),
  },
  "agent.run.completed": { data: z.object({ agentRunId: z.string().uuid() }) },
  "daily.tick": { data: z.object({}) },
} as const;

export type EventName = keyof typeof eventSchemas;
