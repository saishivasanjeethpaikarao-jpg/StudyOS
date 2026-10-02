ALTER TABLE "quiz_attempts" DROP CONSTRAINT "quiz_attempts_quiz_owner_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_owner_fk" FOREIGN KEY ("quiz_id","user_id") REFERENCES "public"."quizzes"("id","user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "study_reminders" ADD CONSTRAINT "study_reminders_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "focus_sessions_one_active_idx" ON "focus_sessions" USING btree ("user_id") WHERE "focus_sessions"."state" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "resource_links_unique_subject_idx" ON "resource_links" USING btree ("resource_id","subject_id") WHERE "resource_links"."subject_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "resource_links_unique_assignment_idx" ON "resource_links" USING btree ("resource_id","assignment_id") WHERE "resource_links"."assignment_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "resource_links_unique_session_idx" ON "resource_links" USING btree ("resource_id","study_session_id") WHERE "resource_links"."study_session_id" IS NOT NULL;