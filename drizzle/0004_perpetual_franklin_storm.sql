ALTER TABLE "meals" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "image_source" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "image_original_url" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "image_prompt" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "image_attribution" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "image_status" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "image_last_updated" timestamp with time zone;