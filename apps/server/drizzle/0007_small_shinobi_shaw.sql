CREATE TABLE "booth_frames" (
	"booth_id" text NOT NULL,
	"user_id" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"media_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booth_frames_booth_id_user_id_pk" PRIMARY KEY("booth_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "booths" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"host_id" text NOT NULL,
	"guest_id" text,
	"envelope" jsonb NOT NULL,
	"config" jsonb NOT NULL,
	"ready" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booth_frames" ADD CONSTRAINT "booth_frames_booth_id_booths_id_fk" FOREIGN KEY ("booth_id") REFERENCES "public"."booths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booth_frames" ADD CONSTRAINT "booth_frames_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booths" ADD CONSTRAINT "booths_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booths" ADD CONSTRAINT "booths_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booths" ADD CONSTRAINT "booths_guest_id_users_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booths_circle_idx" ON "booths" USING btree ("circle_id");