CREATE TABLE "city_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"city" text DEFAULT 'lirih' NOT NULL,
	"season" integer NOT NULL,
	"region_id" text NOT NULL,
	"plot_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"household" text NOT NULL,
	"from_year" integer NOT NULL,
	"to_year" integer NOT NULL,
	"ms_id" text NOT NULL,
	"status" text DEFAULT 'aktif' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "city_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"pen_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "city_profiles_pen_name_unique" UNIQUE("pen_name")
);
--> statement-breakpoint
CREATE TABLE "city_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"claim_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manuscripts" ADD COLUMN "visibility" text DEFAULT 'privat' NOT NULL;--> statement-breakpoint
ALTER TABLE "city_claims" ADD CONSTRAINT "city_claims_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_claims" ADD CONSTRAINT "city_claims_ms_id_manuscripts_id_fk" FOREIGN KEY ("ms_id") REFERENCES "public"."manuscripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_profiles" ADD CONSTRAINT "city_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_reports" ADD CONSTRAINT "city_reports_claim_id_city_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."city_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_reports" ADD CONSTRAINT "city_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "city_claims_plot_idx" ON "city_claims" USING btree ("plot_id");--> statement-breakpoint
CREATE INDEX "city_claims_owner_idx" ON "city_claims" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "city_reports_once" ON "city_reports" USING btree ("claim_id","reporter_id");