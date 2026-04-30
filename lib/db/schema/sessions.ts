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
import { sessionStatusEnum } from "./enums";
import { students } from "./students";
import { tutors } from "./tutors";

/**
 * A scheduled tutoring session. `tutoringSessions` (not `sessions`) to avoid
 * collision with the auth `sessions` namespace.
 */
export const tutoringSessions = pgTable(
  "tutoring_sessions",
  {
    id: idCol(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.id, { onDelete: "restrict" }),

    subject: text("subject").notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),

    status: sessionStatusEnum("status").notNull().default("SCHEDULED"),

    googleEventId: text("google_event_id"),
    googleMeetUrl: text("google_meet_url"),

    notes: text("notes"),

    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    studentStartIdx: index("sessions_student_start_idx").on(
      t.studentId,
      t.startTime,
    ),
    tutorStartIdx: index("sessions_tutor_start_idx").on(t.tutorId, t.startTime),
    statusIdx: index("sessions_status_idx").on(t.status),
  }),
);

export const tutoringSessionsRelations = relations(
  tutoringSessions,
  ({ one }) => ({
    student: one(students, {
      fields: [tutoringSessions.studentId],
      references: [students.id],
    }),
    tutor: one(tutors, {
      fields: [tutoringSessions.tutorId],
      references: [tutors.id],
    }),
  }),
);

export type TutoringSession = typeof tutoringSessions.$inferSelect;
export type NewTutoringSession = typeof tutoringSessions.$inferInsert;
