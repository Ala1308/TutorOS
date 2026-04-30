import { relations } from "drizzle-orm";
import { index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { idCol, softDelete, timestamps } from "./_helpers";
import { userRoleEnum } from "./enums";

/**
 * Users in TutorOS AI. Mirrors Supabase auth.users by id (uuid).
 * `AI_AGENT` is a synthetic role used for audit attribution; agents
 * cannot log into the UI.
 */
export const users = pgTable(
  "users",
  {
    id: idCol(),
    authUserId: uuid("auth_user_id").unique(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    role: userRoleEnum("role").notNull().default("ADMIN"),
    timezone: text("timezone"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    roleIdx: index("users_role_idx").on(t.role),
  }),
);

export const usersRelations = relations(users, () => ({}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
