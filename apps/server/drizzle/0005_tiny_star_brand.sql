CREATE TABLE "circle_seals" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"circle_id" text NOT NULL,
	"sealed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circle_seals_user_id_day_circle_id_pk" PRIMARY KEY("user_id","day","circle_id")
);
--> statement-breakpoint
ALTER TABLE "capsules" ADD COLUMN "scoped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "circle_members" ADD COLUMN "own_page" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "page_circle_id" text;--> statement-breakpoint
ALTER TABLE "circle_seals" ADD CONSTRAINT "circle_seals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_seals" ADD CONSTRAINT "circle_seals_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "circle_seals_circle_idx" ON "circle_seals" USING btree ("circle_id","day");