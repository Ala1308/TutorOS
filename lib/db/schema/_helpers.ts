import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/** Standard primary key column. */
export const idCol = () => uuid("id").primaryKey().defaultRandom();

/** created_at / updated_at columns; pair with the trigger below. */
export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Soft-delete column. */
export const softDelete = () => ({
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/**
 * Re-usable updated_at trigger SQL. Apply once per mutable table in a migration:
 *
 *   CREATE TRIGGER set_updated_at BEFORE UPDATE ON <table>
 *   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
 */
export const setUpdatedAtFunctionSql = sql`
  CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;
