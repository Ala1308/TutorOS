/**
 * Row Level Security policy intent.
 *
 * Drizzle does not yet manage RLS policies natively, so we keep them as
 * raw SQL strings here and apply them via a hand-edited migration after
 * `npm run db:generate`. The intent of every policy is documented inline
 * so reviewers can audit changes.
 *
 * Convention:
 *   - default deny (no permissive policy = no access)
 *   - one named policy per role per action
 *   - policy name format: <table>__<role>_<action>
 *
 * To apply: copy the matching block into a new migration file in `drizzle/`,
 * then `npm run db:migrate`.
 */

export const rlsPolicies = {
  enableRlsAll: /* sql */ `
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE students ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tutoring_sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE automation_preferences ENABLE ROW LEVEL SECURITY;
    ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;
    ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
    ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;
  `,

  /** OWNER and ADMIN see everything. */
  ownerAdminFullAccess: /* sql */ `
    -- Apply per table; example for leads:
    -- CREATE POLICY leads__owner_admin_all ON leads
    --   FOR ALL TO authenticated
    --   USING (auth.jwt() ->> 'role' IN ('OWNER', 'ADMIN'))
    --   WITH CHECK (auth.jwt() ->> 'role' IN ('OWNER', 'ADMIN'));
  `,

  /** Tutors only see students assigned to them via tutoring_sessions. */
  tutorScopedToAssignedStudents: /* sql */ `
    -- CREATE POLICY students__tutor_assigned ON students
    --   FOR SELECT TO authenticated
    --   USING (
    --     auth.jwt() ->> 'role' = 'TUTOR'
    --     AND EXISTS (
    --       SELECT 1 FROM tutoring_sessions ts
    --       WHERE ts.student_id = students.id
    --         AND ts.tutor_id = (auth.jwt() ->> 'app_user_id')::uuid
    --     )
    --   );
  `,

  /** Parents only see their own children. */
  parentScopedToOwnChildren: /* sql */ `
    -- CREATE POLICY students__parent_own ON students
    --   FOR SELECT TO authenticated
    --   USING (
    --     auth.jwt() ->> 'role' = 'PARENT'
    --     AND parent_id = (auth.jwt() ->> 'app_parent_id')::uuid
    --   );
  `,
};
