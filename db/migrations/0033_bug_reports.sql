CREATE TABLE "bug_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"reporter_clerk_id" text NOT NULL,
	"reporter_email" text NOT NULL,
	"message" text NOT NULL,
	"page" text,
	"user_agent" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_admin_id" integer
);
--> statement-breakpoint
CREATE INDEX "bug_reports_status_idx" ON "bug_reports" USING btree ("status","created_at");