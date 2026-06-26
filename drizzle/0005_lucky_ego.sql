DROP INDEX "weekly_dinner_plans_household_week_day_idx";--> statement-breakpoint
ALTER TABLE "weekly_dinner_plans" ADD COLUMN "meal_slot" text DEFAULT 'Dinner' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_dinner_plans_household_week_day_slot_idx" ON "weekly_dinner_plans" USING btree ("household_id","week_start_date","day_of_week","meal_slot");