CREATE TABLE "face_reactions" (
	"drop_id" text NOT NULL,
	"user_id" text NOT NULL,
	"expression" text NOT NULL,
	"ciphertext" text NOT NULL,
	"recipients" jsonb NOT NULL,
	"media_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "face_reactions_drop_id_user_id_pk" PRIMARY KEY("drop_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "face_reactions" ADD CONSTRAINT "face_reactions_drop_id_drops_id_fk" FOREIGN KEY ("drop_id") REFERENCES "public"."drops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_reactions" ADD CONSTRAINT "face_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;