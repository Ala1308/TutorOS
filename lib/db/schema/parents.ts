import { relations } from "drizzle-orm";
import { index, pgTable, text } from "drizzle-orm/pg-core";

import { idCol, softDelete, timestamps } from "./_helpers";

export const parents = pgTable(
  "parents",
  {
    id: idCol(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    timezone: text("timezone"),
    notes: text("notes"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    emailIdx: index("parents_email_idx").on(t.email),
  }),
);

export const parentsRelations = relations(parents, () => ({}));

export type Parent = typeof parents.$inferSelect;
export type NewParent = typeof parents.$inferInsert;
