CREATE TABLE "circle_presence" (
	"circle_id" text NOT NULL,
	"user_id" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "circle_presence_circle_id_user_id_pk" PRIMARY KEY("circle_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "pair_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"author_id" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"about_id" text,
	"enc" text,
	"matched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "circle_presence" ADD CONSTRAINT "circle_presence_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_presence" ADD CONSTRAINT "circle_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pair_notes" ADD CONSTRAINT "pair_notes_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pair_notes" ADD CONSTRAINT "pair_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pair_notes_circle_idx" ON "pair_notes" USING btree ("circle_id","kind","key");