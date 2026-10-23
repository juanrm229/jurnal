CREATE TABLE "work_circles" (
	"work_id" text NOT NULL,
	"circle_id" text NOT NULL,
	CONSTRAINT "work_circles_work_id_circle_id_pk" PRIMARY KEY("work_id","circle_id")
);
--> statement-breakpoint
CREATE TABLE "work_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"author_id" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_reactions" (
	"work_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_reactions_work_id_user_id_kind_pk" PRIMARY KEY("work_id","user_id","kind")
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"envelope" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "work_circles" ADD CONSTRAINT "work_circles_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_circles" ADD CONSTRAINT "work_circles_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_notes" ADD CONSTRAINT "work_notes_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_notes" ADD CONSTRAINT "work_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_reactions" ADD CONSTRAINT "work_reactions_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_reactions" ADD CONSTRAINT "work_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_circles_circle_idx" ON "work_circles" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "work_notes_work_idx" ON "work_notes" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "works_author_idx" ON "works" USING btree ("author_id");