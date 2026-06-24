CREATE TABLE "grocery_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" text NOT NULL,
	"created_by" text,
	"meal_ids" jsonb NOT NULL,
	"item_count" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "grocery_lists_household_created_at_idx" ON "grocery_lists" USING btree ("household_id","created_at");
