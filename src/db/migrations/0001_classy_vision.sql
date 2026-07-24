CREATE TABLE "room_movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"participant_token" varchar(64) NOT NULL,
	"nickname" varchar(40) NOT NULL,
	"is_host" boolean DEFAULT false NOT NULL,
	"is_ready" boolean DEFAULT false NOT NULL,
	"is_done_voting" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"vote" varchar(5) NOT NULL,
	"voted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"join_code" varchar(8) NOT NULL,
	"host_token" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'lobby' NOT NULL,
	"mpaa_filters" jsonb DEFAULT '[]'::jsonb,
	"vote_threshold" integer DEFAULT 0 NOT NULL,
	"winner_movie_id" uuid,
	"locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "rooms_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
ALTER TABLE "room_movies" ADD CONSTRAINT "room_movies_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_movies" ADD CONSTRAINT "room_movies_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_votes" ADD CONSTRAINT "room_votes_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_votes" ADD CONSTRAINT "room_votes_participant_id_room_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."room_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_votes" ADD CONSTRAINT "room_votes_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_winner_movie_id_movies_id_fk" FOREIGN KEY ("winner_movie_id") REFERENCES "public"."movies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_room_movies_room_movie" ON "room_movies" USING btree ("room_id","movie_id");--> statement-breakpoint
CREATE INDEX "idx_room_participants_room" ON "room_participants" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_room_votes_room_participant_movie" ON "room_votes" USING btree ("room_id","participant_id","movie_id");--> statement-breakpoint
CREATE INDEX "idx_room_votes_room" ON "room_votes" USING btree ("room_id","movie_id");--> statement-breakpoint
CREATE INDEX "idx_rooms_join_code" ON "rooms" USING btree ("join_code");