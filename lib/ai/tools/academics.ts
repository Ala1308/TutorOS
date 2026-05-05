import { z } from "zod";

import { defineTool } from "@/lib/ai/toolRegistry";
import { assessmentService } from "@/lib/services/assessmentService";
import { homeworkService } from "@/lib/services/homeworkService";
import { learningPlanService } from "@/lib/services/learningPlanService";

const ROLES = [
  "OWNER",
  "ADMIN",
  "ACADEMIC_MANAGER",
  "TUTOR",
  "AI_AGENT",
] as const;

const ASSESSMENT_TYPES = ["DIAGNOSTIC", "PROGRESS", "FINAL", "OTHER"] as const;
const HOMEWORK_STATUSES = [
  "ASSIGNED",
  "SUBMITTED",
  "REVIEWED",
  "COMPLETED",
  "MISSED",
] as const;
const LEARNING_PLAN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
] as const;

/**
 * Tool: assessment.create
 * Creates a structured evaluation for a student. The agent should fill
 * observations / recommendations meaningfully — this is permanent record.
 */
export const assessmentCreateTool = defineTool({
  name: "assessment.create",
  description:
    "Create a written assessment for a student (diagnostic, progress, final, or other). Use this after a session to capture structured tutor judgement.",
  category: "low",
  inputSchema: z.object({
    studentId: z.string().uuid(),
    tutorId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
    type: z.enum(ASSESSMENT_TYPES).optional(),
    subject: z.string().min(1).max(120),
    title: z.string().min(1).max(200),
    scoreNumerator: z.number().int().min(0).max(100_000).optional(),
    scoreDenominator: z.number().int().min(1).max(100_000).optional(),
    level: z.string().max(60).optional(),
    observations: z.string().max(8000).optional(),
    recommendations: z.string().max(8000).optional(),
    skills: z.array(z.string().min(1).max(80)).max(40).optional(),
  }),
  outputSchema: z.object({
    assessmentId: z.string().uuid(),
    studentId: z.string().uuid(),
    type: z.string(),
    title: z.string(),
  }),
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input, ctx) => {
    const row = await assessmentService.create(
      {
        ...input,
        type: input.type ?? "PROGRESS",
        skills: input.skills ?? [],
      },
      { actor: ctx.actor },
    );
    return {
      assessmentId: row.id,
      studentId: row.studentId,
      type: row.type,
      title: row.title,
    };
  },
});

/**
 * Tool: homework.assign
 * Assigns homework to a student. Optionally tied to a session.
 */
export const homeworkAssignTool = defineTool({
  name: "homework.assign",
  description:
    "Assign new homework to a student. Optionally tie it to a session and set a due date (ISO 8601).",
  category: "low",
  inputSchema: z.object({
    studentId: z.string().uuid(),
    tutorId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    subject: z.string().max(120).optional(),
    instructions: z.string().max(8000).optional(),
    dueDate: z.string().datetime().optional(),
  }),
  outputSchema: z.object({
    homeworkId: z.string().uuid(),
    studentId: z.string().uuid(),
    title: z.string(),
    status: z.string(),
  }),
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input, ctx) => {
    const row = await homeworkService.create(input, { actor: ctx.actor });
    return {
      homeworkId: row.id,
      studentId: row.studentId,
      title: row.title,
      status: row.status,
    };
  },
});

/**
 * Tool: homework.setStatus
 * Updates the status of an existing homework. Use REVIEWED with feedback to
 * give graded feedback; COMPLETED to close the loop without scoring.
 */
export const homeworkSetStatusTool = defineTool({
  name: "homework.setStatus",
  description:
    "Update the status of an existing homework. REVIEWED requires at least one of grade / scorePercent / feedback.",
  category: "low",
  inputSchema: z.object({
    homeworkId: z.string().uuid(),
    status: z.enum(HOMEWORK_STATUSES),
    submissionUrl: z.string().url().max(2048).optional(),
    submissionNotes: z.string().max(8000).optional(),
    grade: z.string().max(20).optional(),
    scorePercent: z.number().int().min(0).max(100).optional(),
    feedback: z.string().max(8000).optional(),
  }),
  outputSchema: z.object({
    homeworkId: z.string().uuid(),
    status: z.string(),
  }),
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input, ctx) => {
    const row = await homeworkService.setStatus(input, { actor: ctx.actor });
    return {
      homeworkId: row.id,
      status: row.status,
    };
  },
});

/**
 * Tool: learningPlan.create
 * Creates a multi-week plan for a student.
 */
export const learningPlanCreateTool = defineTool({
  name: "learningPlan.create",
  description:
    "Create a learning plan for a student with concrete goals. Status defaults to DRAFT until you flip it to ACTIVE.",
  category: "low",
  inputSchema: z.object({
    studentId: z.string().uuid(),
    tutorId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    summary: z.string().max(8000).optional(),
    subject: z.string().max(120).optional(),
    status: z.enum(LEARNING_PLAN_STATUSES).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    goals: z
      .array(
        z.object({
          id: z.string().min(1).max(64),
          title: z.string().min(1).max(200),
          done: z.boolean().optional(),
          note: z.string().max(2000).optional(),
        }),
      )
      .max(100)
      .optional(),
  }),
  outputSchema: z.object({
    learningPlanId: z.string().uuid(),
    studentId: z.string().uuid(),
    title: z.string(),
    status: z.string(),
  }),
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input, ctx) => {
    const row = await learningPlanService.create(
      {
        ...input,
        status: input.status ?? "DRAFT",
        goals: (input.goals ?? []).map((g) => ({
          id: g.id,
          title: g.title,
          done: g.done ?? false,
          ...(g.note ? { note: g.note } : {}),
        })),
      },
      { actor: ctx.actor },
    );
    return {
      learningPlanId: row.id,
      studentId: row.studentId,
      title: row.title,
      status: row.status,
    };
  },
});
