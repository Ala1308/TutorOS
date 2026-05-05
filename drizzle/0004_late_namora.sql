CREATE TYPE "public"."call_outcome" AS ENUM('ANSWERED', 'VOICEMAIL', 'NO_ANSWER', 'BUSY', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."comm_direction" AS ENUM('INBOUND', 'OUTBOUND');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"direction" "comm_direction" NOT NULL,
	"from_number" text,
	"to_number" text,
	"entity_type" text,
	"entity_id" text,
	"summary" text,
	"transcript_url" text,
	"recording_url" text,
	"outcome" "call_outcome",
	"duration_seconds" integer,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_call_id" text,
	"provider" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_threads" ADD COLUMN IF NOT EXISTS "direction" "comm_direction" DEFAULT 'OUTBOUND' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_threads" ADD COLUMN IF NOT EXISTS "body_preview" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "call_records_entity_idx" ON "call_records" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "call_records_occurred_idx" ON "call_records" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "call_records_provider_idx" ON "call_records" USING btree ("provider_call_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_threads_direction_idx" ON "email_threads" USING btree ("direction");