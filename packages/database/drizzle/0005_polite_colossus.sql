CREATE TABLE IF NOT EXISTS "account_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_device_id" varchar(128) NOT NULL,
	"platform" varchar(32) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_successful_sync_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_sync_sequence" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"csrf_hash" varchar(64) NOT NULL,
	"device_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "google_oauth_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_hash" varchar(64) NOT NULL,
	"nonce_hash" varchar(64) NOT NULL,
	"user_id" uuid,
	"intent" varchar(16) DEFAULT 'login' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "google_oauth_transactions_state_hash_unique" UNIQUE("state_hash"),
	CONSTRAINT "google_oauth_transactions_intent_check" CHECK ("google_oauth_transactions"."intent" IN ('login','link'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_bootstrap_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid,
	"snapshot_sequence" bigint NOT NULL,
	"entries" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" uuid NOT NULL,
	"revision" integer,
	"operation" varchar(16) NOT NULL,
	"payload" jsonb,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_changes_operation_check" CHECK ("sync_changes"."operation" IN ('upsert', 'delete'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_mutation_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_mutation_id" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"response" jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_subject" varchar(255) NOT NULL,
	"email_at_link" varchar(255),
	"email_verified_at_link" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sync_states" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sequence" bigint DEFAULT 0 NOT NULL,
	"retention_floor" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sync_states_sequence_check" CHECK ("user_sync_states"."sequence" >= "user_sync_states"."retention_floor" AND "user_sync_states"."retention_floor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_devices" ADD CONSTRAINT "account_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_device_id_account_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."account_devices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "google_oauth_transactions" ADD CONSTRAINT "google_oauth_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_bootstrap_snapshots" ADD CONSTRAINT "sync_bootstrap_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_bootstrap_snapshots" ADD CONSTRAINT "sync_bootstrap_snapshots_device_id_account_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."account_devices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_changes" ADD CONSTRAINT "sync_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_mutation_receipts" ADD CONSTRAINT "sync_mutation_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sync_states" ADD CONSTRAINT "user_sync_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_devices_user_client_idx" ON "account_devices" USING btree ("user_id","client_device_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_devices_user_active_idx" ON "account_devices" USING btree ("user_id","last_active_at") WHERE "account_devices"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_user_active_idx" ON "auth_sessions" USING btree ("user_id","expires_at") WHERE "auth_sessions"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "google_oauth_transactions_expires_idx" ON "google_oauth_transactions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_bootstrap_snapshots_user_expiry_idx" ON "sync_bootstrap_snapshots" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sync_changes_user_sequence_idx" ON "sync_changes" USING btree ("user_id","sequence");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_changes_entity_idx" ON "sync_changes" USING btree ("user_id","entity_type","entity_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sync_mutation_receipts_owner_mutation_idx" ON "sync_mutation_receipts" USING btree ("user_id","client_mutation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_mutation_receipts_created_idx" ON "sync_mutation_receipts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_identities_provider_subject_idx" ON "user_identities" USING btree ("provider","provider_subject");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_identities_user_idx" ON "user_identities" USING btree ("user_id");
--> statement-breakpoint
-- A transactionally serialized, per-user journal sequence avoids cursor holes
-- caused by PostgreSQL global sequences committing out of order.
CREATE OR REPLACE FUNCTION studyos_capture_sync_change() RETURNS trigger AS $$
DECLARE
  row_data jsonb;
  owner_id uuid;
  row_id uuid;
  seq bigint;
  op text;
  revision_value integer;
  entity_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_data := to_jsonb(OLD);
  ELSE
    row_data := to_jsonb(NEW);
  END IF;

  IF TG_TABLE_NAME = 'users' AND TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSIF TG_TABLE_NAME = 'users' THEN
    owner_id := (row_data->>'id')::uuid;
    row_id := owner_id;
    row_data := row_data - 'password_hash' - 'password_reset_token' - 'password_reset_expires';
    entity_name := 'profile';
  ELSIF TG_TABLE_NAME = 'quiz_questions' THEN
    row_id := nullif(row_data->>'id', '')::uuid;
    SELECT quizzes.user_id INTO owner_id FROM quizzes WHERE quizzes.id = nullif(row_data->>'quiz_id', '')::uuid;
    entity_name := 'quiz-question';
  ELSIF TG_TABLE_NAME = 'quiz_options' THEN
    row_id := nullif(row_data->>'id', '')::uuid;
    SELECT quizzes.user_id INTO owner_id FROM quiz_questions
      JOIN quizzes ON quizzes.id = quiz_questions.quiz_id
      WHERE quiz_questions.id = nullif(row_data->>'question_id', '')::uuid;
    entity_name := 'quiz-option';
  ELSIF TG_TABLE_NAME = 'quiz_answers' THEN
    SELECT quiz_attempts.user_id INTO owner_id FROM quiz_attempts
      WHERE quiz_attempts.id = nullif(row_data->>'attempt_id', '')::uuid;
    row_id := (substr(md5(row_data->>'attempt_id' || ':' || row_data->>'question_id'), 1, 8) || '-' ||
      substr(md5(row_data->>'attempt_id' || ':' || row_data->>'question_id'), 9, 4) || '-' ||
      substr(md5(row_data->>'attempt_id' || ':' || row_data->>'question_id'), 13, 4) || '-' ||
      substr(md5(row_data->>'attempt_id' || ':' || row_data->>'question_id'), 17, 4) || '-' ||
      substr(md5(row_data->>'attempt_id' || ':' || row_data->>'question_id'), 21, 12))::uuid;
    entity_name := 'quiz-answer';
  ELSE
    owner_id := nullif(row_data->>'user_id', '')::uuid;
    row_id := nullif(row_data->>'id', '')::uuid;
    entity_name := replace(TG_TABLE_NAME, '_', '-');
  END IF;

  IF owner_id IS NULL OR row_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'DELETE' OR nullif(row_data->>'deleted_at', '') IS NOT NULL THEN
    op := 'delete';
  ELSE
    op := 'upsert';
  END IF;

  -- Do not distribute immutable answer-key snapshots through the generic
  -- change feed; clients retrieve quiz results through the owning API.
  IF TG_TABLE_NAME = 'quiz_attempts' THEN
    row_data := row_data - 'snapshot';
  END IF;
  IF TG_TABLE_NAME = 'resources' OR TG_TABLE_NAME = 'attachments' THEN
    row_data := row_data - 'storage_key';
  END IF;
  revision_value := nullif(row_data->>'revision', '')::integer;

  INSERT INTO user_sync_states (user_id, sequence, retention_floor, updated_at)
  VALUES (owner_id, 1, 0, now())
  ON CONFLICT (user_id) DO UPDATE
    SET sequence = user_sync_states.sequence + 1, updated_at = now()
  RETURNING sequence INTO seq;

  INSERT INTO sync_changes (user_id, sequence, entity_type, entity_id, revision, operation, payload, changed_at)
  VALUES (owner_id, seq, entity_name, row_id, revision_value, op, row_data, now());

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users', 'tasks', 'subtasks', 'time_blocks', 'task_series', 'ideas', 'idea_boards',
    'idea_columns', 'idea_subtasks', 'subjects', 'assignments', 'study_sessions',
    'resources', 'resource_links', 'study_notes', 'study_reminders', 'focus_sessions',
    'quizzes', 'quiz_questions', 'quiz_options', 'quiz_attempts', 'quiz_answers', 'attachments'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS studyos_sync_change ON public.%I', table_name);
      EXECUTE format('CREATE TRIGGER studyos_sync_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION studyos_capture_sync_change()', table_name);
    END IF;
  END LOOP;
END $$;
