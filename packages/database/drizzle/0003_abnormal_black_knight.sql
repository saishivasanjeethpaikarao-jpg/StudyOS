CREATE TABLE IF NOT EXISTS "focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid,
	"assignment_id" uuid,
	"study_session_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"state" varchar(16) DEFAULT 'active' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "focus_sessions_state_check" CHECK ("focus_sessions"."state" IN ('active','completed','cancelled')),
	CONSTRAINT "focus_sessions_time_check" CHECK ("focus_sessions"."ended_at" IS NULL OR "focus_sessions"."ended_at" >= "focus_sessions"."started_at"),
	CONSTRAINT "focus_sessions_duration_check" CHECK ("focus_sessions"."duration_seconds" IS NULL OR "focus_sessions"."duration_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quiz_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option_ids" uuid[] NOT NULL,
	"is_correct" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"status" varchar(16) DEFAULT 'started' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"correct_count" integer,
	"total_questions" integer NOT NULL,
	"score_percent" integer,
	CONSTRAINT "quiz_attempts_status_check" CHECK ("quiz_attempts"."status" IN ('started','submitted'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quiz_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"text" text NOT NULL,
	"position" integer NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"type" varchar(24) NOT NULL,
	"prompt" text NOT NULL,
	"explanation" text,
	"position" integer NOT NULL,
	"source_resource_id" uuid,
	"source_reference" text,
	"provenance" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_questions_type_check" CHECK ("quiz_questions"."type" IN ('single','multiple'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"subject_id" uuid,
	"assignment_id" uuid,
	"resource_id" uuid,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quizzes_status_check" CHECK ("quizzes"."status" IN ('draft','published'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resource_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"subject_id" uuid,
	"assignment_id" uuid,
	"study_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_links_one_target_check" CHECK (num_nonnulls("resource_links"."subject_id", "resource_links"."assignment_id", "resource_links"."study_session_id") = 1)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(16) NOT NULL,
	"title" varchar(500) NOT NULL,
	"url" text,
	"storage_key" text,
	"mime_type" varchar(120),
	"filename" varchar(255),
	"size_bytes" integer,
	"provider_item_id" varchar(128),
	"completed_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_type_check" CHECK ("resources"."type" IN ('file','youtube','web')),
	CONSTRAINT "resources_source_check" CHECK (("resources"."type" = 'file' AND "resources"."storage_key" IS NOT NULL AND "resources"."url" IS NULL) OR ("resources"."type" IN ('youtube','web') AND "resources"."url" IS NOT NULL AND "resources"."storage_key" IS NULL)),
	CONSTRAINT "resources_size_check" CHECK ("resources"."size_bytes" IS NULL OR "resources"."size_bytes" > 0),
	CONSTRAINT "resources_revision_check" CHECK ("resources"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"subject_id" uuid,
	"assignment_id" uuid,
	"study_session_id" uuid,
	"revision" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_notes_revision_check" CHECK ("study_notes"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"subject_id" uuid,
	"assignment_id" uuid,
	"study_session_id" uuid,
	"quiz_id" uuid,
	"state" varchar(16) DEFAULT 'pending' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_reminders_state_check" CHECK ("study_reminders"."state" IN ('pending','dismissed','cancelled')),
	CONSTRAINT "study_reminders_one_target_check" CHECK (num_nonnulls("study_reminders"."subject_id", "study_reminders"."assignment_id", "study_reminders"."study_session_id", "study_reminders"."quiz_id") <= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quizzes_id_user_idx" ON "quizzes" USING btree ("id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "resources_id_user_idx" ON "resources" USING btree ("id","user_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_study_session_id_study_sessions_id_fk" FOREIGN KEY ("study_session_id") REFERENCES "public"."study_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_owner_fk" FOREIGN KEY ("quiz_id","user_id") REFERENCES "public"."quizzes"("id","user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_options" ADD CONSTRAINT "quiz_options_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_source_resource_id_resources_id_fk" FOREIGN KEY ("source_resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_study_session_id_study_sessions_id_fk" FOREIGN KEY ("study_session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_resource_owner_fk" FOREIGN KEY ("resource_id","user_id") REFERENCES "public"."resources"("id","user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resources" ADD CONSTRAINT "resources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_notes" ADD CONSTRAINT "study_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_notes" ADD CONSTRAINT "study_notes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_notes" ADD CONSTRAINT "study_notes_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_notes" ADD CONSTRAINT "study_notes_study_session_id_study_sessions_id_fk" FOREIGN KEY ("study_session_id") REFERENCES "public"."study_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_reminders" ADD CONSTRAINT "study_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_reminders" ADD CONSTRAINT "study_reminders_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_reminders" ADD CONSTRAINT "study_reminders_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_reminders" ADD CONSTRAINT "study_reminders_study_session_id_study_sessions_id_fk" FOREIGN KEY ("study_session_id") REFERENCES "public"."study_sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "focus_sessions_owner_idx" ON "focus_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_answers_attempt_question_idx" ON "quiz_answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_attempts_owner_idx" ON "quiz_attempts" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_attempts_quiz_idx" ON "quiz_attempts" USING btree ("user_id","quiz_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_options_order_idx" ON "quiz_options" USING btree ("question_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_questions_order_idx" ON "quiz_questions" USING btree ("quiz_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quizzes_owner_idx" ON "quizzes" USING btree ("user_id","updated_at") WHERE "quizzes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_links_owner_idx" ON "resource_links" USING btree ("user_id","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_links_subject_idx" ON "resource_links" USING btree ("user_id","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_links_assignment_idx" ON "resource_links" USING btree ("user_id","assignment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_links_session_idx" ON "resource_links" USING btree ("user_id","study_session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_user_active_idx" ON "resources" USING btree ("user_id","created_at") WHERE "resources"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_notes_owner_idx" ON "study_notes" USING btree ("user_id","updated_at") WHERE "study_notes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_reminders_due_idx" ON "study_reminders" USING btree ("user_id","state","remind_at");
