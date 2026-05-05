CREATE TYPE "public"."assessment_type" AS ENUM('DIAGNOSTIC', 'PROGRESS', 'FINAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."homework_status" AS ENUM('ASSIGNED', 'SUBMITTED', 'REVIEWED', 'COMPLETED', 'MISSED');--> statement-breakpoint
CREATE TYPE "public"."learning_plan_status" AS ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_id" uuid,
	"session_id" uuid,
	"type" "assessment_type" DEFAULT 'PROGRESS' NOT NULL,
	"subject" text NOT NULL,
	"title" text NOT NULL,
	"score_numerator" integer,
	"score_denominator" integer,
	"level" text,
	"observations" text,
	"recommendations" text,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "homework" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_id" uuid,
	"session_id" uuid,
	"title" text NOT NULL,
	"subject" text,
	"instructions" text,
	"due_date" timestamp with time zone,
	"status" "homework_status" DEFAULT 'ASSIGNED' NOT NULL,
	"submission_url" text,
	"submission_notes" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"grade" text,
	"score_percent" integer,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_id" uuid,
	"title" text NOT NULL,
	"summary" text,
	"subject" text,
	"status" "learning_plan_status" DEFAULT 'DRAFT' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessments" ADD CONSTRAINT "assessments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessments" ADD CONSTRAINT "assessments_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessments" ADD CONSTRAINT "assessments_session_id_tutoring_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tutoring_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "homework" ADD CONSTRAINT "homework_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "homework" ADD CONSTRAINT "homework_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "homework" ADD CONSTRAINT "homework_session_id_tutoring_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tutoring_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessments_student_idx" ON "assessments" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessments_tutor_idx" ON "assessments" USING btree ("tutor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessments_session_idx" ON "assessments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "homework_student_due_idx" ON "homework" USING btree ("student_id","due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "homework_status_idx" ON "homework" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "homework_session_idx" ON "homework" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_plans_student_idx" ON "learning_plans" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_plans_tutor_idx" ON "learning_plans" USING btree ("tutor_id");