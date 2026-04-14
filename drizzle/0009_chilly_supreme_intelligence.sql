CREATE TYPE "public"."weekly_attendance_group" AS ENUM('elementary', 'junior_high');--> statement-breakpoint
DROP INDEX "weekly_attendance_extra_counts_date_category_key";--> statement-breakpoint
ALTER TABLE "weekly_attendance_extra_counts" ADD COLUMN "group" "weekly_attendance_group" DEFAULT 'elementary';--> statement-breakpoint
UPDATE "weekly_attendance_extra_counts" SET "group" = 'elementary' WHERE "group" IS NULL;--> statement-breakpoint
ALTER TABLE "weekly_attendance_extra_counts" ALTER COLUMN "group" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "weekly_attendance_extra_counts" ALTER COLUMN "group" DROP DEFAULT;--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_attendance_extra_counts_date_category_key" ON "weekly_attendance_extra_counts" USING btree ("attendance_date_id","group","category");
