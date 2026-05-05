import { z } from "zod";

import { defineTool } from "@/lib/ai/toolRegistry";
import { sessionService } from "@/lib/services/sessionService";
import { NotFoundError } from "@/lib/utils/errors";

const ROLES = [
  "OWNER",
  "ADMIN",
  "ACADEMIC_MANAGER",
  "TUTOR",
  "AI_AGENT",
] as const;

const sessionSummary = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  tutorId: z.string().uuid(),
  subject: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  durationMinutes: z.number().int(),
  status: z.string(),
  googleMeetUrl: z.string().nullable(),
  notes: z.string().nullable(),
});

const sessionWithPeople = sessionSummary.extend({
  studentFirstName: z.string(),
  studentLastName: z.string(),
  tutorFullName: z.string(),
});

/**
 * Tool: sessions.list
 * Read-only list of sessions, optionally filtering for upcoming.
 */
export const sessionsListTool = defineTool({
  name: "sessions.list",
  description:
    "List recent or upcoming tutoring sessions (read-only). Returns student and tutor names inline.",
  category: "read",
  inputSchema: z.object({
    upcomingOnly: z.boolean().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  outputSchema: z.object({
    sessions: z.array(sessionWithPeople),
  }),
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input) => {
    const rows = await sessionService.list({
      ...(input.upcomingOnly !== undefined
        ? { upcomingOnly: input.upcomingOnly }
        : {}),
      limit: input.limit ?? 25,
    });
    return {
      sessions: rows.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        tutorId: s.tutorId,
        subject: s.subject,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        durationMinutes: s.durationMinutes,
        status: s.status,
        googleMeetUrl: s.googleMeetUrl ?? null,
        notes: s.notes ?? null,
        studentFirstName: s.studentFirstName,
        studentLastName: s.studentLastName,
        tutorFullName: s.tutorFullName,
      })),
    };
  },
});

/**
 * Tool: sessions.get
 * Read-only fetch of a single session by id.
 */
export const sessionsGetTool = defineTool({
  name: "sessions.get",
  description: "Fetch a single tutoring session by id (read-only).",
  category: "read",
  inputSchema: z.object({
    sessionId: z.string().uuid(),
  }),
  outputSchema: sessionSummary,
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input) => {
    const s = await sessionService.get(input.sessionId);
    if (!s) throw new NotFoundError("Session not found");
    return {
      id: s.id,
      studentId: s.studentId,
      tutorId: s.tutorId,
      subject: s.subject,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      durationMinutes: s.durationMinutes,
      status: s.status,
      googleMeetUrl: s.googleMeetUrl ?? null,
      notes: s.notes ?? null,
    };
  },
});
