CREATE TABLE "auth_codes" (
	"email" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "book_orders" (
	"order_id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"year" integer NOT NULL,
	"status" text DEFAULT 'awaiting_file' NOT NULL,
	"file_key" text,
	"shipping" jsonb NOT NULL,
	"consent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "capsules" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"tz" text NOT NULL,
	"sealed_at" timestamp with time zone,
	CONSTRAINT "capsules_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "chapter_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"month" text NOT NULL,
	"user_id" text NOT NULL,
	"title_enc" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter_votes" (
	"circle_id" text NOT NULL,
	"month" text NOT NULL,
	"user_id" text NOT NULL,
	"proposal_id" text NOT NULL,
	CONSTRAINT "chapter_votes_circle_id_month_user_id_pk" PRIMARY KEY("circle_id","month","user_id")
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"circle_id" text NOT NULL,
	"month" text NOT NULL,
	"title_enc" text,
	"winning_proposal_id" text,
	"closed_at" timestamp with time zone,
	CONSTRAINT "chapters_circle_id_month_pk" PRIMARY KEY("circle_id","month")
);
--> statement-breakpoint
CREATE TABLE "circle_keys" (
	"circle_id" text NOT NULL,
	"epoch" integer NOT NULL,
	"user_id" text NOT NULL,
	"wk" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circle_keys_circle_id_epoch_user_id_pk" PRIMARY KEY("circle_id","epoch","user_id")
);
--> statement-breakpoint
CREATE TABLE "circle_members" (
	"circle_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_day" date NOT NULL,
	"left_day" date,
	"ai_consent" boolean DEFAULT false NOT NULL,
	"memorial_votes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "circle_members_circle_id_user_id_pk" PRIMARY KEY("circle_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "circles" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name_enc" text NOT NULL,
	"doodle" text DEFAULT 'tunas' NOT NULL,
	"settings" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_day" date NOT NULL,
	"current_epoch" integer DEFAULT 1 NOT NULL,
	"rotation_needed" boolean DEFAULT false NOT NULL,
	"moment_starts_on" date,
	"moment_ends_on" date,
	"moment_tier" text,
	"memorial_locked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "constellations" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"name_enc" text NOT NULL,
	"days" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_links" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ephemeral_public_key" text NOT NULL,
	"device_name" text NOT NULL,
	"payload" text,
	"approved_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dice_rolls" (
	"circle_id" text NOT NULL,
	"week" text NOT NULL,
	"day" date,
	"rolled_by" text NOT NULL,
	"rolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dice_rolls_circle_id_week_pk" PRIMARY KEY("circle_id","week")
);
--> statement-breakpoint
CREATE TABLE "dictionary" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"term_enc" text NOT NULL,
	"meaning_enc" text NOT NULL,
	"added_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drop_circles" (
	"drop_id" text NOT NULL,
	"circle_id" text NOT NULL,
	"day" date NOT NULL,
	"author_id" text NOT NULL,
	CONSTRAINT "drop_circles_drop_id_circle_id_pk" PRIMARY KEY("drop_id","circle_id")
);
--> statement-breakpoint
CREATE TABLE "drop_recipients" (
	"drop_id" text NOT NULL,
	"seq" integer NOT NULL,
	"circle_id" text,
	"user_id" text,
	"epoch" integer,
	"wk" text NOT NULL,
	CONSTRAINT "drop_recipients_drop_id_seq_pk" PRIMARY KEY("drop_id","seq")
);
--> statement-breakpoint
CREATE TABLE "drops" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"day" date NOT NULL,
	"kind" text NOT NULL,
	"audience" text NOT NULL,
	"person_id" text,
	"unlock_on" date,
	"ciphertext" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"media_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" text,
	CONSTRAINT "entitlements_user_id_code_pk" PRIMARY KEY("user_id","code")
);
--> statement-breakpoint
CREATE TABLE "expeditions" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"code" text NOT NULL,
	"start_day" date NOT NULL,
	"end_day" date NOT NULL,
	"started_by" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "footnotes" (
	"id" text PRIMARY KEY NOT NULL,
	"drop_id" text NOT NULL,
	"author_id" text NOT NULL,
	"ciphertext" text NOT NULL,
	"recipients" jsonb NOT NULL,
	"include_in_print" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "freezes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"month" text NOT NULL,
	"kind" text NOT NULL,
	"day" date,
	"other_user_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "genre_votes" (
	"circle_id" text NOT NULL,
	"year" integer NOT NULL,
	"user_id" text NOT NULL,
	"genre_id" text NOT NULL,
	CONSTRAINT "genre_votes_circle_id_year_user_id_pk" PRIMARY KEY("circle_id","year","user_id")
);
--> statement-breakpoint
CREATE TABLE "gift_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"product" text NOT NULL,
	"purchaser_id" text NOT NULL,
	"order_id" text NOT NULL,
	"redeemed_by" text,
	"redeemed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"token" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"created_by" text NOT NULL,
	"bundle" text NOT NULL,
	"proof" text NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "letter_opens" (
	"letter_id" text NOT NULL,
	"user_id" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "letter_opens_letter_id_user_id_pk" PRIMARY KEY("letter_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "letters" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text,
	"circle_id" text,
	"ciphertext" text NOT NULL,
	"recipients" jsonb NOT NULL,
	"media_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deliver_on" date,
	"milestone_days" integer,
	"delivered_at" timestamp with time zone,
	"notified_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mood_pulse" (
	"day" date NOT NULL,
	"province" text NOT NULL,
	"mood" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "mood_pulse_day_province_mood_pk" PRIMARY KEY("day","province","mood")
);
--> statement-breakpoint
CREATE TABLE "mood_pulse_dedupe" (
	"tag" text PRIMARY KEY NOT NULL,
	"day" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "motifs" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"year" integer NOT NULL,
	"term_enc" text NOT NULL,
	"added_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nicknames" (
	"circle_id" text NOT NULL,
	"giver_id" text NOT NULL,
	"target_id" text NOT NULL,
	"nickname_enc" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nicknames_circle_id_giver_id_target_id_pk" PRIMARY KEY("circle_id","giver_id","target_id")
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"key" text PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product" text NOT NULL,
	"amount_idr" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"payment_url" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "public_wraps" (
	"slug" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"drop_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_drop_id_user_id_kind_pk" PRIMARY KEY("drop_id","user_id","kind")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"target_user_id" text NOT NULL,
	"circle_id" text,
	"drop_id" text,
	"reason" text NOT NULL,
	"note" text,
	"disclosed_content" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"circle_id" text NOT NULL,
	"week" text NOT NULL,
	"pen_holder_id" text NOT NULL,
	"title_enc" text,
	"card_id" text,
	CONSTRAINT "scenes_circle_id_week_pk" PRIMARY KEY("circle_id","week")
);
--> statement-breakpoint
CREATE TABLE "season_overrides" (
	"key" text PRIMARY KEY NOT NULL,
	"start" date NOT NULL,
	"end" date NOT NULL,
	"peak" date
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"device_name" text NOT NULL,
	"platform" text NOT NULL,
	"push_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"day" date NOT NULL,
	"drop_id" text,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"pen_name" text,
	"doodle" text DEFAULT 'tunas' NOT NULL,
	"birth_year" integer,
	"birthday" text,
	"tz" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"city_id" text,
	"home_city_id" text,
	"public_key" text,
	"key_backup" jsonb,
	"plan" text DEFAULT 'free' NOT NULL,
	"plan_until" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"circle_id" text NOT NULL,
	"day" date NOT NULL,
	"last_visited_on" date NOT NULL,
	CONSTRAINT "visits_circle_id_day_pk" PRIMARY KEY("circle_id","day")
);
--> statement-breakpoint
CREATE TABLE "volumes" (
	"circle_id" text NOT NULL,
	"year" integer NOT NULL,
	"genre_id" text,
	"cover_doodle" text,
	CONSTRAINT "volumes_circle_id_year_pk" PRIMARY KEY("circle_id","year")
);
--> statement-breakpoint
ALTER TABLE "capsules" ADD CONSTRAINT "capsules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_proposals" ADD CONSTRAINT "chapter_proposals_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_votes" ADD CONSTRAINT "chapter_votes_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_keys" ADD CONSTRAINT "circle_keys_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_keys" ADD CONSTRAINT "circle_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constellations" ADD CONSTRAINT "constellations_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_links" ADD CONSTRAINT "device_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dictionary" ADD CONSTRAINT "dictionary_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_circles" ADD CONSTRAINT "drop_circles_drop_id_drops_id_fk" FOREIGN KEY ("drop_id") REFERENCES "public"."drops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_circles" ADD CONSTRAINT "drop_circles_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_recipients" ADD CONSTRAINT "drop_recipients_drop_id_drops_id_fk" FOREIGN KEY ("drop_id") REFERENCES "public"."drops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drops" ADD CONSTRAINT "drops_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "footnotes" ADD CONSTRAINT "footnotes_drop_id_drops_id_fk" FOREIGN KEY ("drop_id") REFERENCES "public"."drops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "footnotes" ADD CONSTRAINT "footnotes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freezes" ADD CONSTRAINT "freezes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genre_votes" ADD CONSTRAINT "genre_votes_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_opens" ADD CONSTRAINT "letter_opens_letter_id_letters_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letters" ADD CONSTRAINT "letters_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "motifs" ADD CONSTRAINT "motifs_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nicknames" ADD CONSTRAINT "nicknames_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_wraps" ADD CONSTRAINT "public_wraps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_drop_id_drops_id_fk" FOREIGN KEY ("drop_id") REFERENCES "public"."drops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volumes" ADD CONSTRAINT "volumes_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "members_user_idx" ON "circle_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "drop_circles_circle_day_idx" ON "drop_circles" USING btree ("circle_id","day");--> statement-breakpoint
CREATE INDEX "recipients_circle_idx" ON "drop_recipients" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "recipients_user_idx" ON "drop_recipients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "drops_author_day_idx" ON "drops" USING btree ("author_id","day");--> statement-breakpoint
CREATE INDEX "drops_day_idx" ON "drops" USING btree ("day");--> statement-breakpoint
CREATE INDEX "freezes_user_month_idx" ON "freezes" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX "letters_to_idx" ON "letters" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "letters_circle_idx" ON "letters" USING btree ("circle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tokens_unique_idx" ON "tokens" USING btree ("circle_id","user_id","code","day");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");