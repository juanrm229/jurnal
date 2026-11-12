CREATE TABLE "city_relations" (
	"id" text PRIMARY KEY NOT NULL,
	"from_claim_id" text NOT NULL,
	"from_tokoh" text NOT NULL,
	"to_claim_id" text NOT NULL,
	"to_tokoh" text NOT NULL,
	"type" text NOT NULL,
	"counter" text,
	"state" text DEFAULT 'ketuk' NOT NULL,
	"letter" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "city_claims" ADD COLUMN "kind" text DEFAULT 'rumah' NOT NULL;--> statement-breakpoint
ALTER TABLE "city_relations" ADD CONSTRAINT "city_relations_from_claim_id_city_claims_id_fk" FOREIGN KEY ("from_claim_id") REFERENCES "public"."city_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_relations" ADD CONSTRAINT "city_relations_to_claim_id_city_claims_id_fk" FOREIGN KEY ("to_claim_id") REFERENCES "public"."city_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "city_relations_from_idx" ON "city_relations" USING btree ("from_claim_id");--> statement-breakpoint
CREATE INDEX "city_relations_to_idx" ON "city_relations" USING btree ("to_claim_id");