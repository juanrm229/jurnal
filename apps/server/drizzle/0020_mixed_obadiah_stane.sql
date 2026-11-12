CREATE TABLE "story_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"round" integer NOT NULL,
	"author_id" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"state" text DEFAULT 'usul' NOT NULL,
	"agrees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"defers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supersedes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_reads" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"part_id" text NOT NULL,
	"reader_id" text NOT NULL,
	"kind" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "offers" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "palette" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "focus" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "edition" jsonb;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "edition_ok" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "story_notes" ADD COLUMN "resolution" text;--> statement-breakpoint
ALTER TABLE "story_parts" ADD COLUMN "handoff" jsonb;--> statement-breakpoint
ALTER TABLE "story_parts" ADD COLUMN "intent" jsonb;--> statement-breakpoint
ALTER TABLE "story_parts" ADD COLUMN "perk" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "story_parts" ADD COLUMN "veils" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "story_facts" ADD CONSTRAINT "story_facts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_facts" ADD CONSTRAINT "story_facts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reads" ADD CONSTRAINT "story_reads_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reads" ADD CONSTRAINT "story_reads_part_id_story_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."story_parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reads" ADD CONSTRAINT "story_reads_reader_id_users_id_fk" FOREIGN KEY ("reader_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_facts_story_idx" ON "story_facts" USING btree ("story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_reads_once" ON "story_reads" USING btree ("part_id","reader_id","kind");