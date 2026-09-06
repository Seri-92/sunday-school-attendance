CREATE TYPE "public"."attendance_notification_kind" AS ENUM('reminder', 'completion');--> statement-breakpoint
CREATE TABLE "attendance_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_year_id" uuid NOT NULL,
	"date" date NOT NULL,
	"kind" "attendance_notification_kind" NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"message" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "attendance_notifications" ADD CONSTRAINT "attendance_notifications_school_year_id_school_years_id_fk" FOREIGN KEY ("school_year_id") REFERENCES "public"."school_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_notifications_year_date_kind_key" ON "attendance_notifications" USING btree ("school_year_id","date","kind");