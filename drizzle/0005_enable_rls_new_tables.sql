-- Enable Row Level Security on all tables that contain user data.
--
-- Idempotent: ALTER TABLE ... ENABLE RLS is a no-op when already enabled.
-- Default policy on a RLS-enabled table is DENY ALL; per-role policies are
-- introduced separately as the auth model lands. Service-role server code
-- continues to bypass RLS, with audited reasons.
--
-- Source of truth: lib/auth/rls.ts.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "parents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tutors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tutoring_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "approval_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "automation_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drive_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "google_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "org_profile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_knowledge_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assessments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "homework" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "learning_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "call_records" ENABLE ROW LEVEL SECURITY;
