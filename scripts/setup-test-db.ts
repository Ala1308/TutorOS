/* eslint-disable no-console */
/**
 * Sets up a fresh test database for integration tests.
 *
 * Strategy (per CONTRIBUTING.md §22):
 *   - Connects to TEST_DATABASE_URL (defaults to ${DATABASE_URL}_test).
 *   - Drops and recreates the public schema.
 *   - Applies the SQL files in supabase/migrations/ in order.
 *
 * Run:
 *   TEST_DATABASE_URL=postgres://... npm run test:setup
 *
 * Status: STUB. Wire this when adding the first integration test.
 *   - Use postgres-js to connect with the provided URL.
 *   - Read supabase/migrations/*.sql in lex order, execute each as a single tx.
 *   - Optionally seed deterministic OWNER/ADMIN/TUTOR/PARENT users for RLS tests.
 */
async function main() {
  console.log(
    "test:setup is a stub. Implement when adding the first integration test that needs a fresh DB.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
