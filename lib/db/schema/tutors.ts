import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";

import { idCol, softDelete, timestamps } from "./_helpers";
import { tutorStatusEnum } from "./enums";

export const tutors = pgTable(
  "tutors",
  {
    id: idCol(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    status: tutorStatusEnum("status").notNull().default("APPLIED"),
    subjects: jsonb("subjects").$type<string[]>().default([]),
    grades: jsonb("grades").$type<string[]>().default([]),
    hourlyRateCents: integer("hourly_rate_cents"),
    notes: text("notes"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    statusIdx: index("tutors_status_idx").on(t.status),
    emailIdx: index("tutors_email_idx").on(t.email),
  }),
);

export const tutorsRelations = relations(tutors, () => ({}));

export type Tutor = typeof tutors.$inferSelect;
export type NewTutor = typeof tutors.$inferInsert;
