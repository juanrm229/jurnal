CREATE TABLE "manuscripts" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text,
	"owner_id" text NOT NULL,
	"members" jsonb NOT NULL,
	"meta" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ms_canon" (
	"id" text PRIMARY KEY NOT NULL,
	"ms_id" text NOT NULL,
	"kind" text NOT NULL,
	"author_id" text NOT NULL,
	"updated_by" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ms_scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"ms_id" text NOT NULL,
	"author_id" text NOT NULL,
	"chapter" integer DEFAULT 1 NOT NULL,
	"order" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draf' NOT NULL,
	"envelope" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ms_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"scene_id" text NOT NULL,
	"version" integer NOT NULL,
	"envelope" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ms_canon" ADD CONSTRAINT "ms_canon_ms_id_manuscripts_id_fk" FOREIGN KEY ("ms_id") REFERENCES "public"."manuscripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ms_canon" ADD CONSTRAINT "ms_canon_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ms_scenes" ADD CONSTRAINT "ms_scenes_ms_id_manuscripts_id_fk" FOREIGN KEY ("ms_id") REFERENCES "public"."manuscripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ms_scenes" ADD CONSTRAINT "ms_scenes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ms_versions" ADD CONSTRAINT "ms_versions_scene_id_ms_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."ms_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manuscripts_owner_idx" ON "manuscripts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ms_canon_ms_idx" ON "ms_canon" USING btree ("ms_id");--> statement-breakpoint
CREATE INDEX "ms_scenes_ms_idx" ON "ms_scenes" USING btree ("ms_id");--> statement-breakpoint
CREATE INDEX "ms_versions_scene_idx" ON "ms_versions" USING btree ("scene_id");