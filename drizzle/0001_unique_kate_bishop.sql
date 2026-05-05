CREATE TABLE IF NOT EXISTS "org_profile" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"voice_tone" text DEFAULT '' NOT NULL,
	"brand_guidelines" text DEFAULT '' NOT NULL,
	"business_hours" text DEFAULT '' NOT NULL,
	"default_currency" text DEFAULT 'CAD' NOT NULL,
	"default_timezone" text DEFAULT 'America/Montreal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"system_prompt_override" text,
	"model_provider" text,
	"model_name" text,
	"temperature_bp" smallint,
	"confidence_threshold_bp" smallint,
	"max_risk_level" "risk_level",
	"default_automation_level" "automation_mode",
	"cost_cap_cents" integer,
	"timeout_ms" integer,
	"prompt_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"agent_scopes" text[] DEFAULT '{"*"}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_settings_name_idx" ON "agent_settings" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_knowledge_enabled_idx" ON "agent_knowledge_documents" USING btree ("enabled");