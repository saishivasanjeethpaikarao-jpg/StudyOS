CREATE TABLE IF NOT EXISTS "study_plan_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"client_mutation_id" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"planned_minutes" integer NOT NULL,
	"status" varchar(20) DEFAULT 'planned' NOT NULL,
	"actual_minutes" integer,
	"completed_at" timestamp with time zone,
	"plan_application_id" uuid,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "study_sessions_time_order_check" CHECK ("study_sessions"."end_at" > "study_sessions"."start_at"),
	CONSTRAINT "study_sessions_planned_minutes_check" CHECK ("study_sessions"."planned_minutes" > 0),
	CONSTRAINT "study_sessions_revision_check" CHECK ("study_sessions"."revision" >= 1),
	CONSTRAINT "study_sessions_actual_minutes_check" CHECK ("study_sessions"."actual_minutes" IS NULL OR "study_sessions"."actual_minutes" >= 0),
	CONSTRAINT "study_sessions_timezone_check" CHECK (length(trim("study_sessions"."timezone")) > 0),
	CONSTRAINT "study_sessions_status_check" CHECK ("study_sessions"."status" IN ('planned', 'completed', 'skipped', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "time_blocks" ADD COLUMN "study_session_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assignments_id_user_idx" ON "assignments" USING btree ("id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "study_plan_applications_id_owner_assignment_idx" ON "study_plan_applications" USING btree ("id","user_id","assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "study_sessions_id_user_idx" ON "study_sessions" USING btree ("id","user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_plan_applications" ADD CONSTRAINT "study_plan_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_plan_applications" ADD CONSTRAINT "study_plan_applications_assignment_owner_fk" FOREIGN KEY ("assignment_id","user_id") REFERENCES "public"."assignments"("id","user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_assignment_owner_fk" FOREIGN KEY ("assignment_id","user_id") REFERENCES "public"."assignments"("id","user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_plan_application_owner_fk" FOREIGN KEY ("plan_application_id","user_id","assignment_id") REFERENCES "public"."study_plan_applications"("id","user_id","assignment_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "study_plan_applications_user_mutation_idx" ON "study_plan_applications" USING btree ("user_id","client_mutation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_plan_applications_user_assignment_idx" ON "study_plan_applications" USING btree ("user_id","assignment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_sessions_user_start_idx" ON "study_sessions" USING btree ("user_id","start_at") WHERE "study_sessions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_sessions_user_assignment_start_idx" ON "study_sessions" USING btree ("user_id","assignment_id","start_at") WHERE "study_sessions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_sessions_plan_application_idx" ON "study_sessions" USING btree ("plan_application_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_study_session_owner_fk" FOREIGN KEY ("study_session_id","user_id") REFERENCES "public"."study_sessions"("id","user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "time_blocks_study_session_id_idx" ON "time_blocks" USING btree ("study_session_id");--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_task_or_study_session_check" CHECK ("time_blocks"."task_id" IS NULL OR "time_blocks"."study_session_id" IS NULL);
