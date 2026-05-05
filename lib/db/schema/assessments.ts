import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { idCol, softDelete, timestamps } from "./_helpers";
import { assessmentTypeEnum } from "./enums";
import { tutoringSessions } from "./sessions";
import { students } from "./students";
import { tutors } from "./tutors";

/**
 * An evaluation written about a student. Independent of homework — represents
 * a tutor's structured judgement at a moment in time (diagnostic, progress
 * report, final assessment, etc.).
 */
export const assessments = pgTable(
  "assessments",
  {
    id: idCol(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    tutorId: uuid("tutor_id").references(() => tutors.id, {
      onDelete: "set null",
    }),
    sessionId: uuid("session_id").references(() => tutoringSessions.id, {
      onDelete: "set null",
    }),

    type: assessmentTypeEnum("type").notNull().default("PROGRESS"),
    subject: text("subject").notNull(),
    title: text("title").notNull(),

    /**
     * Optional score: rendered as `scoreNumerator / scoreDenominator`. Both
     * null = ungraded. We keep them as raw integers to avoid float drift.
     */
    scoreNumerator: integer("score_numerator"),
    scoreDenominator: integer("score_denominator"),
    level: text("level"),

    observations: text("observations"),
    recommendations: text("recommendations"),
    skills: jsonb("skills").$type<string[]>().default([]),

    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    studentIdx: index("assessments_student_idx").on(t.studentId, t.createdAt),
    tutorIdx: index("assessments_tutor_idx").on(t.tutorId),
    sessionIdx: index("assessments_session_idx").on(t.sessionId),
  }),
);

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  student: one(students, {
    fields: [assessments.studentId],
    references: [students.id],
  }),
  tutor: one(tutors, {
    fields: [assessments.tutorId],
    references: [tutors.id],
  }),
  session: one(tutoringSessions, {
    fields: [assessments.sessionId],
    references: [tutoringSessions.id],
  }),
}));

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
