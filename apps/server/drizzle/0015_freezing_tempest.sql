CREATE TABLE "week_rolls" (
	"circle_id" text NOT NULL,
	"week" text NOT NULL,
	"user_id" text NOT NULL,
	"drop_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "week_rolls_circle_id_week_user_id_pk" PRIMARY KEY("circle_id","week","user_id")
);
--> statement-breakpoint
ALTER TABLE "week_rolls" ADD CONSTRAINT "week_rolls_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_rolls" ADD CONSTRAINT "week_rolls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;