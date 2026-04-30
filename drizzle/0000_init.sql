CREATE TYPE "public"."actor_type" AS ENUM('USER', 'AGENT', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT', 'AWAITING_APPROVAL', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."automation_mode" AS ENUM('MANUAL', 'DRAFT_ONLY', 'AUTO_AFTER_APPROVAL', 'FULL_AUTO');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('DATA_PROCESSING', 'EMAIL_COMMUNICATION', 'SESSION_RECORDING', 'SESSION_TRANSCRIPTION', 'MARKETING_COMMUNICATION');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('WEBSITE', 'REFERRAL', 'SOCIAL', 'PARTNER', 'ADS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."tutor_status" AS ENUM('APPLIED', 'SCREENING', 'TEST_SENT', 'INTERVIEW', 'ACTIVE', 'INACTIVE', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'ADMIN', 'ACADEMIC_MANAGER', 'TUTOR', 'PARENT', 'STUDENT', 'AI_AGENT');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" DEFAULT 'ADMIN' NOT NULL,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"timezone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"grade" text,
	"school" text,
	"subjects" jsonb DEFAULT '[]'::jsonb,
	"is_minor" boolean DEFAULT true NOT NULL,
	"timezone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tutors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"status" "tutor_status" DEFAULT 'APPLIED' NOT NULL,
	"subjects" jsonb DEFAULT '[]'::jsonb,
	"grades" jsonb DEFAULT '[]'::jsonb,
	"hourly_rate_cents" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tutors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_name" text NOT NULL,
	"parent_email" text NOT NULL,
	"parent_phone" text,
	"student_grade" text NOT NULL,
	"subject_needed" text NOT NULL,
	"message" text,
	"source" "lead_source" DEFAULT 'WEBSITE' NOT NULL,
	"source_meta" jsonb DEFAULT '{}'::jsonb,
	"status" "lead_status" DEFAULT 'NEW' NOT NULL,
	"score" integer,
	"risk_level" "risk_level",
	"risk_flags" jsonb DEFAULT '[]'::jsonb,
	"scoring_reasoning" text,
	"converted_at" timestamp with time zone,
	"converted_to_parent_id" uuid,
	"consent_data_processing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tutoring_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" "session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"google_event_id" text,
	"google_meet_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"agent_version" integer NOT NULL,
	"workflow_step" text NOT NULL,
	"trigger_source" text NOT NULL,
	"parent_run_id" uuid,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"status" "agent_run_status" DEFAULT 'RUNNING' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"confidence_x100" integer,
	"risk_level" "risk_level",
	"risk_flags" jsonb DEFAULT '[]'::jsonb,
	"requires_approval_int" integer DEFAULT 0,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_cents" integer,
	"model_provider" text,
	"model_name" text,
	"langfuse_trace_id" text,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_run_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"proposed_action" text NOT NULL,
	"proposed_payload" jsonb,
	"current_state" jsonb,
	"risk_level" "risk_level" DEFAULT 'MEDIUM' NOT NULL,
	"status" "approval_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"metadata" jsonb,
	"agent_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workflow_step" text NOT NULL,
	"mode" "automation_mode" DEFAULT 'DRAFT_ONLY' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"granted_by_actor_type" text,
	"granted_by_actor_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drive_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_file_id" text NOT NULL,
	"drive_url" text NOT NULL,
	"name" text NOT NULL,
	"mime_type" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"folder_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "drive_files_google_file_id_unique" UNIQUE("google_file_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gmail_thread_id" text,
	"subject" text NOT NULL,
	"from_email" text NOT NULL,
	"to_emails" jsonb NOT NULL,
	"cc_emails" jsonb DEFAULT '[]'::jsonb,
	"bcc_emails" jsonb DEFAULT '[]'::jsonb,
	"entity_type" text,
	"entity_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "google_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"scope" text NOT NULL,
	"token_type" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "students" ADD CONSTRAINT "students_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tutoring_sessions" ADD CONSTRAINT "tutoring_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tutoring_sessions" ADD CONSTRAINT "tutoring_sessions_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_preferences" ADD CONSTRAINT "automation_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "google_tokens" ADD CONSTRAINT "google_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parents_email_idx" ON "parents" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_parent_id_idx" ON "students" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_name_idx" ON "students" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tutors_status_idx" ON "tutors" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tutors_email_idx" ON "tutors" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads" USING btree ("parent_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_source_idx" ON "leads" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_student_start_idx" ON "tutoring_sessions" USING btree ("student_id","start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_tutor_start_idx" ON "tutoring_sessions" USING btree ("tutor_id","start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_status_idx" ON "tutoring_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_runs_agent_name_idx" ON "agent_runs" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_runs_status_idx" ON "agent_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_runs_entity_idx" ON "agent_runs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_runs_created_at_idx" ON "agent_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approvals_status_idx" ON "approval_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approvals_entity_idx" ON "approval_requests" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approvals_created_at_idx" ON "approval_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approvals_agent_run_idx" ON "approval_requests" USING btree ("agent_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_actor_idx" ON "audit_log" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "automation_user_step_idx" ON "automation_preferences" USING btree ("user_id","workflow_step");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_step_idx" ON "automation_preferences" USING btree ("workflow_step");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consents_subject_idx" ON "consents" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consents_type_idx" ON "consents" USING btree ("consent_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_files_entity_idx" ON "drive_files" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_threads_entity_idx" ON "email_threads" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_threads_gmail_idx" ON "email_threads" USING btree ("gmail_thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "google_tokens_user_idx" ON "google_tokens" USING btree ("user_id");