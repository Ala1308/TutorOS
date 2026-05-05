import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { idCol, softDelete, timestamps } from "./_helpers";
import { homeworkStatusEnum } from "./enums";
import { tutoringSessions } from "./sessions";
import { students } from "./students";
import { tutors } from "./tutors";

/**
 * Homework assigned to a student, optionally tied to the session it came out
 * of. Status moves through ASSIGNED -> SUBMITTED -> REVIEWED/COMPLETED, with
 * MISSED as a terminal failure.
 */
export const homework = pgTable(
  "homework",
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

    title: text("title").notNull(),
    subject: text("subject"),
    instructions: text("instructions"),
    dueDate: timestamp("due_date", { withTimezone: true }),

    status: homeworkStatusEnum("status").notNull().default("ASSIGNED"),

    submissionUrl: text("submission_url"),
    submissionNotes: text("submission_notes"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    grade: text("grade"),
    /** 0..100 percentage; integer to avoid float drift. */
    scorePercent: integer("score_percent"),
    feedback: text("feedback"),

    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    studentDueIdx: index("homework_student_due_idx").on(t.studentId, t.dueDate),
    statusIdx: index("homework_status_idx").on(t.status),
    sessionIdx: index("homework_session_idx").on(t.sessionId),
  }),
);

export const homeworkRelations = relations(homework, ({ one }) => ({
  student: one(students, {
    fields: [homework.studentId],
    references: [students.id],
  }),
  tutor: one(tutors, {
    fields: [homework.tutorId],
    references: [tutors.id],
  }),
  session: one(tutoringSessions, {
    fields: [homework.sessionId],
    references: [tutoringSessions.id],
  }),
}));

export type Homework = typeof homework.$inferSelect;
export type NewHomework = typeof homework.$inferInsert;
