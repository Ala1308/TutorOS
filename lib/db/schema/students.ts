import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { idCol, softDelete, timestamps } from "./_helpers";
import { parents } from "./parents";

export const students = pgTable(
  "students",
  {
    id: idCol(),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "restrict" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    grade: text("grade"),
    school: text("school"),
    subjects: jsonb("subjects").$type<string[]>().default([]),
    isMinor: boolean("is_minor").notNull().default(true),
    timezone: text("timezone"),
    notes: text("notes"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    parentIdx: index("students_parent_id_idx").on(t.parentId),
    nameIdx: index("students_name_idx").on(t.lastName, t.firstName),
  }),
);

export const studentsRelations = relations(students, ({ one }) => ({
  parent: one(parents, {
    fields: [students.parentId],
    references: [parents.id],
  }),
}));

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
