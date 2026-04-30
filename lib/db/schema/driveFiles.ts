import { index, pgTable, text } from "drizzle-orm/pg-core";

import { idCol, softDelete, timestamps } from "./_helpers";

/**
 * One row per file we track in Google Drive. The DB stores Drive IDs and URLs;
 * code never deletes from Drive — soft-delete here instead.
 */
export const driveFiles = pgTable(
  "drive_files",
  {
    id: idCol(),
    googleFileId: text("google_file_id").notNull().unique(),
    driveUrl: text("drive_url").notNull(),
    name: text("name").notNull(),
    mimeType: text("mime_type"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    folderPath: text("folder_path"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    entityIdx: index("drive_files_entity_idx").on(t.entityType, t.entityId),
  }),
);

export type DriveFile = typeof driveFiles.$inferSelect;
export type NewDriveFile = typeof driveFiles.$inferInsert;
