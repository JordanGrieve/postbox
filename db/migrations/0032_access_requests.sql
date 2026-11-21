CREATE TABLE "access_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"business_name" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by_admin_id" integer,
	"workspace_id" integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX "access_requests_one_pending_idx" ON "access_requests" USING btree ("clerk_user_id") WHERE "access_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "access_requests_status_idx" ON "access_requests" USING btree ("status","created_at");