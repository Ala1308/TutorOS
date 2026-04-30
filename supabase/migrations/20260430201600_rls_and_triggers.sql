-- =============================================================================
-- RLS + updated_at trigger + role-aware policies
--
-- Per CONTRIBUTING.md §5 (RLS on every user-data table, default deny) and
-- §11 (tutors only see assigned students, parents only see own children).
--
-- Strategy:
--   * Every table here has RLS enabled.
--   * A SECURITY DEFINER helper `auth.tutoros_role()` reads the operator's
--     role from the local `users` row keyed by `auth.uid()`. This avoids
--     storing role data in the JWT claims (which would require an Auth Hook).
--   * OWNER + ADMIN bypass scoping rules (full_access policies).
--   * ACADEMIC_MANAGER reads everything operational; cannot resolve approvals.
--   * TUTOR is scoped to assigned students/sessions only.
--   * PARENT is scoped to their own children only (joined via parents.email).
--   * Service-role server code bypasses RLS entirely (postgres role).
-- =============================================================================

-- ---------- updated_at trigger ----------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'users', 'parents', 'students', 'tutors', 'leads', 'tutoring_sessions',
      'agent_runs', 'approval_requests', 'audit_log',
      'automation_preferences', 'consents', 'drive_files',
      'email_threads', 'google_tokens'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
       CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t
    );
  END LOOP;
END $$;

-- audit_log is append-only — NO updated_at trigger and a guard against UPDATE/DELETE.
DROP TRIGGER IF EXISTS set_updated_at ON public.audit_log;

CREATE OR REPLACE FUNCTION public.audit_log_immutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only (action: %)', TG_OP USING ERRCODE = 'feature_not_supported';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_update ON public.audit_log;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

DROP TRIGGER IF EXISTS audit_log_no_delete ON public.audit_log;
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

-- ---------- role helper -----------------------------------------------------
-- SECURITY DEFINER so the function can read public.users even when the caller
-- has no select policy on it yet.
CREATE OR REPLACE FUNCTION public.tutoros_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.tutoros_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tutoros_role() TO authenticated;

-- Tutors join through tutors.email = auth.email() since tutors is not yet
-- linked to auth.users. Parents join the same way.
CREATE OR REPLACE FUNCTION public.tutoros_self_tutor_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT t.id FROM public.tutors t
  WHERE t.email = auth.email()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.tutoros_self_parent_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id FROM public.parents p
  WHERE p.email = auth.email()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.tutoros_self_tutor_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tutoros_self_parent_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tutoros_self_tutor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tutoros_self_parent_id() TO authenticated;

-- ---------- enable RLS on every table ---------------------------------------
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoring_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_files            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_threads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens          ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (safer in case service-role drift happens).
ALTER TABLE public.audit_log              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.consents               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens          FORCE ROW LEVEL SECURITY;

-- ---------- users -----------------------------------------------------------
-- Operators see all users; everyone authenticated can read their own row.
CREATE POLICY users__operator_read ON public.users
  FOR SELECT TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

CREATE POLICY users__self_read ON public.users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY users__owner_admin_write ON public.users
  FOR ALL TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN'))
  WITH CHECK (public.tutoros_role() IN ('OWNER', 'ADMIN'));

-- ---------- parents ---------------------------------------------------------
CREATE POLICY parents__operator_all ON public.parents
  FOR ALL TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'))
  WITH CHECK (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

CREATE POLICY parents__self_read ON public.parents
  FOR SELECT TO authenticated
  USING (
    public.tutoros_role() = 'PARENT'
    AND id = public.tutoros_self_parent_id()
  );

-- ---------- students --------------------------------------------------------
CREATE POLICY students__operator_all ON public.students
  FOR ALL TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'))
  WITH CHECK (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

-- Parents only see their own children.
CREATE POLICY students__parent_own ON public.students
  FOR SELECT TO authenticated
  USING (
    public.tutoros_role() = 'PARENT'
    AND parent_id = public.tutoros_self_parent_id()
  );

-- Tutors only see students they have a session with.
CREATE POLICY students__tutor_assigned ON public.students
  FOR SELECT TO authenticated
  USING (
    public.tutoros_role() = 'TUTOR'
    AND EXISTS (
      SELECT 1 FROM public.tutoring_sessions ts
      WHERE ts.student_id = students.id
        AND ts.tutor_id = public.tutoros_self_tutor_id()
    )
  );

-- ---------- tutors ----------------------------------------------------------
CREATE POLICY tutors__operator_all ON public.tutors
  FOR ALL TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'))
  WITH CHECK (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

CREATE POLICY tutors__self_read ON public.tutors
  FOR SELECT TO authenticated
  USING (
    public.tutoros_role() = 'TUTOR'
    AND id = public.tutoros_self_tutor_id()
  );

-- ---------- leads -----------------------------------------------------------
-- Leads are pre-conversion data; only operators see them.
CREATE POLICY leads__operator_all ON public.leads
  FOR ALL TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'))
  WITH CHECK (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

-- ---------- tutoring_sessions ----------------------------------------------
CREATE POLICY sessions__operator_all ON public.tutoring_sessions
  FOR ALL TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'))
  WITH CHECK (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

CREATE POLICY sessions__tutor_own ON public.tutoring_sessions
  FOR SELECT TO authenticated
  USING (
    public.tutoros_role() = 'TUTOR'
    AND tutor_id = public.tutoros_self_tutor_id()
  );

CREATE POLICY sessions__parent_own ON public.tutoring_sessions
  FOR SELECT TO authenticated
  USING (
    public.tutoros_role() = 'PARENT'
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = tutoring_sessions.student_id
        AND s.parent_id = public.tutoros_self_parent_id()
    )
  );

-- ---------- agent_runs ------------------------------------------------------
-- Operators only. Tutors / parents never see raw agent execution data.
CREATE POLICY agent_runs__operator_read ON public.agent_runs
  FOR SELECT TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

-- Writes are done via service-role server code (bypasses RLS).
-- No INSERT / UPDATE / DELETE policies for `authenticated` on agent_runs.

-- ---------- approval_requests ----------------------------------------------
CREATE POLICY approvals__operator_read ON public.approval_requests
  FOR SELECT TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

CREATE POLICY approvals__owner_admin_resolve ON public.approval_requests
  FOR UPDATE TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN'))
  WITH CHECK (public.tutoros_role() IN ('OWNER', 'ADMIN'));

-- INSERT goes through service-role.

-- ---------- audit_log -------------------------------------------------------
CREATE POLICY audit__owner_admin_read ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN'));

-- INSERT goes through service-role only. UPDATE/DELETE blocked by trigger.

-- ---------- automation_preferences -----------------------------------------
CREATE POLICY automation__operator_read ON public.automation_preferences
  FOR SELECT TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

CREATE POLICY automation__owner_admin_write ON public.automation_preferences
  FOR ALL TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN'))
  WITH CHECK (public.tutoros_role() IN ('OWNER', 'ADMIN'));

-- ---------- consents --------------------------------------------------------
-- Operators full access; subjects can read their own grants.
CREATE POLICY consents__operator_all ON public.consents
  FOR ALL TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'))
  WITH CHECK (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

CREATE POLICY consents__parent_own ON public.consents
  FOR SELECT TO authenticated
  USING (
    public.tutoros_role() = 'PARENT'
    AND subject_type = 'Parent'
    AND subject_id = public.tutoros_self_parent_id()::text
  );

-- ---------- drive_files / email_threads -----------------------------------
CREATE POLICY drive_files__operator_all ON public.drive_files
  FOR ALL TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'))
  WITH CHECK (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

CREATE POLICY email_threads__operator_all ON public.email_threads
  FOR ALL TO authenticated
  USING (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'))
  WITH CHECK (public.tutoros_role() IN ('OWNER', 'ADMIN', 'ACADEMIC_MANAGER'));

-- ---------- google_tokens (sensitive) --------------------------------------
-- Tokens are encrypted at rest; only the owning user can read their own row,
-- and writes are server-side via service-role.
CREATE POLICY google_tokens__self_read ON public.google_tokens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = google_tokens.user_id
        AND u.auth_user_id = auth.uid()
    )
  );
