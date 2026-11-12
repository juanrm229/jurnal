CREATE TABLE "stories" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text,
	"owner_id" text NOT NULL,
	"premise" text NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"phase" text DEFAULT 'write' NOT NULL,
	"members" jsonb NOT NULL,
	"roles" jsonb NOT NULL,
	"ready" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_parts" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"round" integer NOT NULL,
	"author_id" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"sealed_at" timestamp with time zone,
	"agrees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_parts" ADD CONSTRAINT "story_parts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_parts" ADD CONSTRAINT "story_parts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stories_circle_idx" ON "stories" USING btree ("circle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_parts_once" ON "story_parts" USING btree ("story_id","round","author_id");