import { z } from "zod";

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

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((s) => (s ? s.trim() : undefined));

const optionalUuid = z
  .string()
  .uuid()
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? s : undefined));

const optionalUrl = z
  .string()
  .max(2048)
  .url()
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? s : undefined));

const optionalIsoDateTime = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? s : undefined))
  .refine((s) => s === undefined || !Number.isNaN(Date.parse(s)), {
    message: "Invalid date/time",
  });

// ---------------------------------------------------------------- Assessments
export const assessmentCreateSchema = z
  .object({
    studentId: z.string().uuid(),
    tutorId: optionalUuid,
    sessionId: optionalUuid,
    type: z.enum(ASSESSMENT_TYPES).default("PROGRESS"),
    subject: z.string().min(1).max(120),
    title: z.string().min(1).max(200),
    scoreNumerator: z.number().int().min(0).max(100_000).optional(),
    scoreDenominator: z.number().int().min(1).max(100_000).optional(),
    level: optionalText(60),
    observations: optionalText(8000),
    recommendations: optionalText(8000),
    skills: z.array(z.string().min(1).max(80)).max(40).default([]),
  })
  .refine(
    (v) =>
      (v.scoreNumerator === undefined && v.scoreDenominator === undefined) ||
      (v.scoreNumerator !== undefined && v.scoreDenominator !== undefined),
    {
      message: "Provide both numerator and denominator, or neither",
      path: ["scoreNumerator"],
    },
  );
export type AssessmentCreateInput = z.infer<typeof assessmentCreateSchema>;

export const assessmentUpdateSchema = z
  .object({
    type: z.enum(ASSESSMENT_TYPES).optional(),
    subject: z.string().min(1).max(120).optional(),
    title: z.string().min(1).max(200).optional(),
    scoreNumerator: z.number().int().min(0).max(100_000).nullable().optional(),
    scoreDenominator: z
      .number()
      .int()
      .min(1)
      .max(100_000)
      .nullable()
      .optional(),
    level: optionalText(60),
    observations: optionalText(8000),
    recommendations: optionalText(8000),
    skills: z.array(z.string().min(1).max(80)).max(40).optional(),
    tutorId: optionalUuid,
    sessionId: optionalUuid,
  })
  .refine(
    (v) => {
      const hasNum =
        v.scoreNumerator !== undefined && v.scoreNumerator !== null;
      const hasDen =
        v.scoreDenominator !== undefined && v.scoreDenominator !== null;
      // Allow update of just one when both already set; service enforces invariants.
      return hasNum === hasDen || hasNum !== hasDen;
    },
    { message: "Invalid score" },
  );
export type AssessmentUpdateInput = z.infer<typeof assessmentUpdateSchema>;

// ------------------------------------------------------------------- Homework
export const homeworkCreateSchema = z.object({
  studentId: z.string().uuid(),
  tutorId: optionalUuid,
  sessionId: optionalUuid,
  title: z.string().min(1).max(200),
  subject: optionalText(120),
  instructions: optionalText(8000),
  dueDate: optionalIsoDateTime,
});
export type HomeworkCreateInput = z.infer<typeof homeworkCreateSchema>;

export const homeworkUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subject: optionalText(120),
  instructions: optionalText(8000),
  dueDate: optionalIsoDateTime,
  tutorId: optionalUuid,
  sessionId: optionalUuid,
});
export type HomeworkUpdateInput = z.infer<typeof homeworkUpdateSchema>;

export const homeworkStatusSchema = z
  .object({
    homeworkId: z.string().uuid(),
    status: z.enum(HOMEWORK_STATUSES),
    submissionUrl: optionalUrl,
    submissionNotes: optionalText(8000),
    grade: optionalText(20),
    scorePercent: z.number().int().min(0).max(100).optional(),
    feedback: optionalText(8000),
  })
  .refine(
    (v) =>
      v.status !== "REVIEWED" ||
      v.feedback !== undefined ||
      v.scorePercent !== undefined ||
      v.grade !== undefined,
    {
      message: "Add feedback, a grade, or a score to mark as reviewed",
      path: ["feedback"],
    },
  );
export type HomeworkStatusInput = z.infer<typeof homeworkStatusSchema>;

// ------------------------------------------------------------- Learning plans
export const learningPlanGoalSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  done: z.boolean().default(false),
  note: optionalText(2000),
  completedAt: optionalIsoDateTime,
});
export type LearningPlanGoalInput = z.infer<typeof learningPlanGoalSchema>;

export const learningPlanCreateSchema = z
  .object({
    studentId: z.string().uuid(),
    tutorId: optionalUuid,
    title: z.string().min(1).max(200),
    summary: optionalText(8000),
    subject: optionalText(120),
    status: z.enum(LEARNING_PLAN_STATUSES).default("DRAFT"),
    startDate: optionalIsoDateTime,
    endDate: optionalIsoDateTime,
    goals: z.array(learningPlanGoalSchema).max(100).default([]),
  })
  .refine(
    (v) =>
      !v.startDate ||
      !v.endDate ||
      Date.parse(v.endDate) >= Date.parse(v.startDate),
    { message: "endDate must be on or after startDate", path: ["endDate"] },
  );
export type LearningPlanCreateInput = z.infer<typeof learningPlanCreateSchema>;

export const learningPlanUpdateSchema = z
  .object({
    tutorId: optionalUuid,
    title: z.string().min(1).max(200).optional(),
    summary: optionalText(8000),
    subject: optionalText(120),
    status: z.enum(LEARNING_PLAN_STATUSES).optional(),
    startDate: optionalIsoDateTime,
    endDate: optionalIsoDateTime,
    goals: z.array(learningPlanGoalSchema).max(100).optional(),
  })
  .refine(
    (v) =>
      !v.startDate ||
      !v.endDate ||
      Date.parse(v.endDate) >= Date.parse(v.startDate),
    { message: "endDate must be on or after startDate", path: ["endDate"] },
  );
export type LearningPlanUpdateInput = z.infer<typeof learningPlanUpdateSchema>;

export const ASSESSMENT_TYPE_VALUES = ASSESSMENT_TYPES;
export const HOMEWORK_STATUS_VALUES = HOMEWORK_STATUSES;
export const LEARNING_PLAN_STATUS_VALUES = LEARNING_PLAN_STATUSES;
