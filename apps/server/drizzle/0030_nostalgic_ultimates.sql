CREATE TABLE "city_figure_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"figure_id" text NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"year" integer,
	"region" text,
	"proposer_id" text NOT NULL,
	"endorsers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"state" text DEFAULT 'usul' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "city_figures" (
	"id" text PRIMARY KEY NOT NULL,
	"city" text DEFAULT 'sangkala' NOT NULL,
	"name" text NOT NULL,
	"julukan" text,
	"region" text NOT NULL,
	"tempat" text NOT NULL,
	"ciri" text NOT NULL,
	"born" integer,
	"died" integer,
	"tetap" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proposer_id" text NOT NULL,
	"endorsers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"state" text DEFAULT 'usul' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "city_holds" (
	"id" text PRIMARY KEY NOT NULL,
	"claim_id" text NOT NULL,
	"tokoh_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"letter" text NOT NULL,
	"state" text DEFAULT 'minta' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "city_figure_changes" ADD CONSTRAINT "city_figure_changes_proposer_id_users_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_figures" ADD CONSTRAINT "city_figures_proposer_id_users_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_holds" ADD CONSTRAINT "city_holds_claim_id_city_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."city_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_holds" ADD CONSTRAINT "city_holds_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "city_figure_changes_fig_idx" ON "city_figure_changes" USING btree ("figure_id");--> statement-breakpoint
CREATE INDEX "city_holds_claim_idx" ON "city_holds" USING btree ("claim_id");