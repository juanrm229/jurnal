CREATE TABLE "dream_likes" (
	"dream_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "dream_likes_dream_id_user_id_pk" PRIMARY KEY("dream_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "dreams" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"author_id" text NOT NULL,
	"envelope" jsonb NOT NULL,
	"meet_id" text,
	"done_at" timestamp with time zone,
	"done_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dream_likes" ADD CONSTRAINT "dream_likes_dream_id_dreams_id_fk" FOREIGN KEY ("dream_id") REFERENCES "public"."dreams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dream_likes" ADD CONSTRAINT "dream_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dreams" ADD CONSTRAINT "dreams_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dreams" ADD CONSTRAINT "dreams_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dreams" ADD CONSTRAINT "dreams_meet_id_meets_id_fk" FOREIGN KEY ("meet_id") REFERENCES "public"."meets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dreams_circle_idx" ON "dreams" USING btree ("circle_id");