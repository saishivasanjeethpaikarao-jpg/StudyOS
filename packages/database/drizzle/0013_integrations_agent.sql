CREATE TABLE IF NOT EXISTS "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"encrypted_credentials" text,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_link_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"link_code" varchar(64) NOT NULL,
	"telegram_chat_id" varchar(64),
	"telegram_username" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" varchar(64),
	"username" varchar(255),
	"is_enabled" boolean DEFAULT true NOT NULL,
	"notify_session_reminders" boolean DEFAULT true NOT NULL,
	"notify_due_dates" boolean DEFAULT true NOT NULL,
	"notify_daily_briefing" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" varchar(5),
	"quiet_hours_end" varchar(5),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) DEFAULT 'Hermes Agent' NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allowed_workflows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workflow_type" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text NOT NULL,
	"proposed_action" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending_approval' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"workflow_type" varchar(64) NOT NULL,
	"schedule_time" varchar(5) NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"channels" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) NOT NULL,
	"summary" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"error_message" text,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"integration_type" varchar(64) NOT NULL,
	"action" varchar(64) NOT NULL,
	"status" varchar(20) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"error_message" text,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_link_requests" ADD CONSTRAINT "telegram_link_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_settings" ADD CONSTRAINT "telegram_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_connections" ADD CONSTRAINT "agent_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_proposals" ADD CONSTRAINT "agent_proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_definitions" ADD CONSTRAINT "automation_definitions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_execution_logs" ADD CONSTRAINT "automation_execution_logs_automation_id_automation_definitions_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automation_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "automation_execution_logs" ADD CONSTRAINT "automation_execution_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_audit_logs" ADD CONSTRAINT "integration_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_connections_user_id_idx" ON "integration_connections" ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integration_connections_user_provider_account_idx" ON "integration_connections" ("user_id", "provider", "provider_account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "telegram_link_requests_code_idx" ON "telegram_link_requests" ("link_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_link_requests_user_idx" ON "telegram_link_requests" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "telegram_settings_user_idx" ON "telegram_settings" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_connections_user_idx" ON "agent_connections" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_proposals_user_status_idx" ON "agent_proposals" ("user_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_definitions_user_idx" ON "automation_definitions" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_definitions_active_idx" ON "automation_definitions" ("is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_execution_logs_automation_idx" ON "automation_execution_logs" ("automation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_execution_logs_user_idx" ON "automation_execution_logs" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_audit_logs_user_idx" ON "integration_audit_logs" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_audit_logs_type_idx" ON "integration_audit_logs" ("integration_type");
