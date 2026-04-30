import { index, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { text } from "drizzle-orm/pg-core";

import { idCol, timestamps } from "./_helpers";
import { automationModeEnum } from "./enums";
import { users } from "./users";

/**
 * Per-user, per-workflow-step automation preference.
 * Default for any (user, step) pair that has no row is `DRAFT_ONLY`.
 *
 * Workflow step keys live in lib/services/automationService.ts.
 */
export const automationPreferences = pgTable(
  "automation_preferences",
  {
    id: idCol(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workflowStep: text("workflow_step").notNull(),
    mode: automationModeEnum("mode").notNull().default("DRAFT_ONLY"),
    ...timestamps(),
  },
  (t) => ({
    userStepIdx: uniqueIndex("automation_user_step_idx").on(
      t.userId,
      t.workflowStep,
    ),
    stepIdx: index("automation_step_idx").on(t.workflowStep),
  }),
);

export type AutomationPreference = typeof automationPreferences.$inferSelect;
export type NewAutomationPreference = typeof automationPreferences.$inferInsert;
