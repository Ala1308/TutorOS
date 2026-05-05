import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { idCol, softDelete, timestamps } from "./_helpers";
import { learningPlanStatusEnum } from "./enums";
import { students } from "./students";
import { tutors } from "./tutors";

/**
 * One element of a learning plan. Stored as JSON inside `learning_plans.goals`
 * so the operator can re-order / mark off without a per-row migration.
 */
export interface LearningPlanGoal {
  id: string;
  title: string;
  done: boolean;
  /** Optional progress note ("started review unit 3", etc.) */
  note?: string;
  /** ISO date when the goal was completed. */
  completedAt?: string;
}

/**
 * A multi-week learning plan attached to a student, optionally owned by a
 * tutor. Goals live as JSON to keep the migration footprint small for MVP.
 */
export const learningPlans = pgTable(
  "learning_plans",
  {
    id: idCol(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    tutorId: uuid("tutor_id").references(() => tutors.id, {
      onDelete: "set null",
    }),

    title: text("title").notNull(),
    summary: text("summary"),
    subject: text("subject"),

    status: learningPlanStatusEnum("status").notNull().default("DRAFT"),

    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),

    goals: jsonb("goals").$type<LearningPlanGoal[]>().notNull().default([]),

    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    studentIdx: index("learning_plans_student_idx").on(t.studentId, t.status),
    tutorIdx: index("learning_plans_tutor_idx").on(t.tutorId),
  }),
);

export const learningPlansRelations = relations(learningPlans, ({ one }) => ({
  student: one(students, {
    fields: [learningPlans.studentId],
    references: [students.id],
  }),
  tutor: one(tutors, {
    fields: [learningPlans.tutorId],
    references: [tutors.id],
  }),
}));

export type LearningPlan = typeof learningPlans.$inferSelect;
export type NewLearningPlan = typeof learningPlans.$inferInsert;
