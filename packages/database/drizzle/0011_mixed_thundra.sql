CREATE TABLE IF NOT EXISTS "mobile_auth_handoffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mobile_auth_handoffs_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
ALTER TABLE "google_oauth_transactions" ADD COLUMN "mobile_redirect_uri" varchar(512);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mobile_auth_handoffs" ADD CONSTRAINT "mobile_auth_handoffs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mobile_auth_handoffs_expiry_idx" ON "mobile_auth_handoffs" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mobile_auth_handoffs_user_idx" ON "mobile_auth_handoffs" USING btree ("user_id");