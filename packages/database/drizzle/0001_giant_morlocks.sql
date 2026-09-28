CREATE TABLE IF NOT EXISTS "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid,
	"title" varchar(500) NOT NULL,
	"description" text,
	"due_at" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'not_started' NOT NULL,
	"priority" varchar(2) DEFAULT 'P2' NOT NULL,
	"estimated_minutes" integer,
	"completed_minutes" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"icon" varchar(64),
	"color" varchar(7),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assignments" ADD CONSTRAINT "assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assignments" ADD CONSTRAINT "assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_user_due_idx" ON "assignments" USING btree ("user_id","due_at") WHERE "assignments"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_subject_idx" ON "assignments" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_user_status_idx" ON "assignments" USING btree ("user_id","status") WHERE "assignments"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subjects_user_sort_idx" ON "subjects" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subjects_user_archived_idx" ON "subjects" USING btree ("user_id","archived_at");