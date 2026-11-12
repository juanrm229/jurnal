CREATE TABLE "city_events" (
	"id" text PRIMARY KEY NOT NULL,
	"city" text DEFAULT 'sangkala' NOT NULL,
	"title" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"to_year" integer,
	"regions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"body" text NOT NULL,
	"proposer_id" text NOT NULL,
	"endorsers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"state" text DEFAULT 'usul' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "city_events" ADD CONSTRAINT "city_events_proposer_id_users_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "city_events_city_idx" ON "city_events" USING btree ("city");