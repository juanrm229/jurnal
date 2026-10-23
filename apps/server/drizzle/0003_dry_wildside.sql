CREATE TABLE "meet_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"meet_id" text NOT NULL,
	"author_id" text NOT NULL,
	"kind" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"media_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meet_members" (
	"meet_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rsvp" text,
	"arrived_at" timestamp with time zone,
	"met_at" timestamp with time zone,
	CONSTRAINT "meet_members_meet_id_user_id_pk" PRIMARY KEY("meet_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "meets" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"envelope" jsonb NOT NULL,
	"reminded_day" boolean DEFAULT false NOT NULL,
	"reminded_soon" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meet_entries" ADD CONSTRAINT "meet_entries_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meet_entries" ADD CONSTRAINT "meet_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meet_members" ADD CONSTRAINT "meet_members_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meet_members" ADD CONSTRAINT "meet_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meets" ADD CONSTRAINT "meets_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meets" ADD CONSTRAINT "meets_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meet_entries_meet_idx" ON "meet_entries" USING btree ("meet_id");--> statement-breakpoint
CREATE INDEX "meets_circle_idx" ON "meets" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "meets_starts_idx" ON "meets" USING btree ("starts_at");