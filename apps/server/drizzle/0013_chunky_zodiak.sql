CREATE TABLE "game_rooms" (
	"code" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
