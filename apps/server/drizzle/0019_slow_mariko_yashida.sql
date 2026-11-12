CREATE TABLE "story_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"part_id" text NOT NULL,
	"author_id" text NOT NULL,
	"reason" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "story_parts_once";--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "rounds" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "deck" text DEFAULT 'awal' NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "mode" text DEFAULT 'terbuka' NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "meta" jsonb;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "skips" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "roles_log" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "story_parts" ADD COLUMN "world" text DEFAULT 'a' NOT NULL;--> statement-breakpoint
ALTER TABLE "story_notes" ADD CONSTRAINT "story_notes_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_notes" ADD CONSTRAINT "story_notes_part_id_story_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."story_parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_notes" ADD CONSTRAINT "story_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_notes_story_idx" ON "story_notes" USING btree ("story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_parts_once" ON "story_parts" USING btree ("story_id","round","author_id","world");