CREATE TABLE IF NOT EXISTS "ai_provider_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"encrypted_api_key" text,
	"key_mask" varchar(16),
	"default_model" varchar(128),
	"custom_endpoint" varchar(512),
	"is_enabled" boolean DEFAULT true NOT NULL,
	"status" varchar(24) DEFAULT 'unconfigured' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_provider_configs_provider_check" CHECK ("ai_provider_configs"."provider" IN ('gemini', 'groq', 'nim')),
	CONSTRAINT "ai_provider_configs_status_check" CHECK ("ai_provider_configs"."status" IN ('unconfigured', 'configured', 'verified', 'error'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ai_enabled" boolean DEFAULT true NOT NULL,
	"default_provider" varchar(32) DEFAULT 'gemini' NOT NULL,
	"fallback_providers" text[] DEFAULT ARRAY['groq', 'nim']::text[] NOT NULL,
	"allow_fallback" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_user_settings_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "ai_user_settings_default_provider_check" CHECK ("ai_user_settings"."default_provider" IN ('gemini', 'groq', 'nim'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_task_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_type" varchar(32) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"model" varchar(128) NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"status" varchar(24) NOT NULL,
	"fallback_from" varchar(32),
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_task_history_status_check" CHECK ("ai_task_history"."status" IN ('completed', 'failed', 'fallback_used'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_provider_configs" ADD CONSTRAINT "ai_provider_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_user_settings" ADD CONSTRAINT "ai_user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_task_history" ADD CONSTRAINT "ai_task_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_provider_configs_user_provider_idx" ON "ai_provider_configs" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_provider_configs_user_idx" ON "ai_provider_configs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_user_settings_user_idx" ON "ai_user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_task_history_user_created_idx" ON "ai_task_history" USING btree ("user_id","created_at");
