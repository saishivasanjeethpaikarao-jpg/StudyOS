ALTER TABLE "subtasks" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_revision_check" CHECK ("subtasks"."revision" >= 1);--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_revision_check" CHECK ("tasks"."revision" >= 1);