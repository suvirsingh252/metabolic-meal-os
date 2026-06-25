CREATE TABLE "grocery_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grocery_list_id" uuid NOT NULL,
	"ingredient" text NOT NULL,
	"category" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_dinner_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" text NOT NULL,
	"week_start_date" date NOT NULL,
	"day_of_week" text NOT NULL,
	"meal_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD COLUMN "source_type" text;--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD COLUMN "week_start_date" date;--> statement-breakpoint
ALTER TABLE "grocery_lists" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "grocery_list_items" ADD CONSTRAINT "grocery_list_items_grocery_list_id_grocery_lists_id_fk" FOREIGN KEY ("grocery_list_id") REFERENCES "public"."grocery_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grocery_list_items_list_idx" ON "grocery_list_items" USING btree ("grocery_list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grocery_list_items_list_ingredient_idx" ON "grocery_list_items" USING btree ("grocery_list_id","ingredient");--> statement-breakpoint
CREATE INDEX "weekly_dinner_plans_household_week_idx" ON "weekly_dinner_plans" USING btree ("household_id","week_start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_dinner_plans_household_week_day_idx" ON "weekly_dinner_plans" USING btree ("household_id","week_start_date","day_of_week");--> statement-breakpoint
CREATE INDEX "grocery_lists_household_week_idx" ON "grocery_lists" USING btree ("household_id","week_start_date");