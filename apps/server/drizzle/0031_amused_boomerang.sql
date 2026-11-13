ALTER TABLE "city_profiles" ADD COLUMN "pena_lama" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "city_profiles" ADD COLUMN "pena_at" timestamp with time zone;