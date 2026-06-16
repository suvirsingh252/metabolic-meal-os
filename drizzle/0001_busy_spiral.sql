CREATE TABLE "dinner_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" text NOT NULL,
	"meal_id" uuid NOT NULL,
	"chip_type" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dinner_feedback" ADD CONSTRAINT "dinner_feedback_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dinner_feedback_household_meal_idx" ON "dinner_feedback" USING btree ("household_id","meal_id");--> statement-breakpoint
CREATE INDEX "dinner_feedback_created_at_idx" ON "dinner_feedback" USING btree ("created_at");