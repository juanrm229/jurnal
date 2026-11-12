CREATE TABLE "story_research" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"author_id" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'terbuka' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story_research" ADD CONSTRAINT "story_research_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_research" ADD CONSTRAINT "story_research_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_research_story_idx" ON "story_research" USING btree ("story_id");