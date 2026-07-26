CREATE TABLE "list_pack_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"items_json" jsonb DEFAULT '[]'::jsonb,
	"refreshed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "list_pack_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"tmdb_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"title" varchar(500) NOT NULL,
	"poster_path" varchar(500),
	"release_date" date,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "list_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"kind" varchar(24) NOT NULL,
	"refresh_strategy" varchar(16) DEFAULT 'weekly' NOT NULL,
	"source_config" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"new_count" integer DEFAULT 0 NOT NULL,
	"degraded" boolean DEFAULT false NOT NULL,
	"refreshed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "list_packs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "list_pack_history" ADD CONSTRAINT "list_pack_history_pack_id_list_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."list_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_pack_items" ADD CONSTRAINT "list_pack_items_pack_id_list_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."list_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_list_pack_history_pack" ON "list_pack_history" USING btree ("pack_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_list_pack_items_pack_tmdb" ON "list_pack_items" USING btree ("pack_id","tmdb_id");--> statement-breakpoint
CREATE INDEX "idx_list_pack_items_pack" ON "list_pack_items" USING btree ("pack_id","position");--> statement-breakpoint
CREATE INDEX "idx_list_packs_slug" ON "list_packs" USING btree ("slug");