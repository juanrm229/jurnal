CREATE TABLE "ms_works" (
	"id" text PRIMARY KEY NOT NULL,
	"ms_id" text NOT NULL,
	"author_id" text NOT NULL,
	"bentuk" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"order" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ms_scenes" ADD COLUMN "work_id" text;--> statement-breakpoint
ALTER TABLE "ms_works" ADD CONSTRAINT "ms_works_ms_id_manuscripts_id_fk" FOREIGN KEY ("ms_id") REFERENCES "public"."manuscripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ms_works" ADD CONSTRAINT "ms_works_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ms_works_ms_idx" ON "ms_works" USING btree ("ms_id");