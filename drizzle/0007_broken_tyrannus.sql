CREATE TYPE "public"."attendance_extra_category" AS ENUM('guardian', 'junior_high_other');--> statement-breakpoint
CREATE TABLE "attendance_extra_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_date_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"category" "attendance_extra_category" NOT NULL,
	"headcount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_extra_counts" ADD CONSTRAINT "attendance_extra_counts_attendance_date_id_attendance_dates_id_fk" FOREIGN KEY ("attendance_date_id") REFERENCES "public"."attendance_dates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_extra_counts" ADD CONSTRAINT "attendance_extra_counts_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_extra_counts_date_class_category_key" ON "attendance_extra_counts" USING btree ("attendance_date_id","class_id","category");--> statement-breakpoint
CREATE INDEX "attendance_extra_counts_class_idx" ON "attendance_extra_counts" USING btree ("class_id");--> statement-breakpoint
CREATE TABLE "weekly_attendance_extra_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_date_id" uuid NOT NULL,
	"category" "attendance_extra_category" NOT NULL,
	"headcount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weekly_attendance_extra_counts" ADD CONSTRAINT "weekly_attendance_extra_counts_attendance_date_id_attendance_dates_id_fk" FOREIGN KEY ("attendance_date_id") REFERENCES "public"."attendance_dates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_attendance_extra_counts_date_category_key" ON "weekly_attendance_extra_counts" USING btree ("attendance_date_id","category");
