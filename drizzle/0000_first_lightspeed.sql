CREATE TYPE "public"."assignment_type" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."grade_code" AS ENUM('kindergarten', 'elementary_1', 'elementary_2', 'elementary_3', 'elementary_4', 'elementary_5', 'elementary_6', 'junior_high_1', 'junior_high_2', 'junior_high_3');--> statement-breakpoint
CREATE TYPE "public"."teacher_role" AS ENUM('admin', 'teacher');--> statement-breakpoint
CREATE TABLE "attendance_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_year_id" uuid NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_date_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" varchar(32) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_year_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"grade_code" "grade_code" NOT NULL,
	"teacher_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(32) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_class_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"school_year_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"assignment_type" "assignment_type" DEFAULT 'auto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"current_grade_code" "grade_code" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "teacher_role" DEFAULT 'teacher' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_dates" ADD CONSTRAINT "attendance_dates_school_year_id_school_years_id_fk" FOREIGN KEY ("school_year_id") REFERENCES "public"."school_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_attendance_date_id_attendance_dates_id_fk" FOREIGN KEY ("attendance_date_id") REFERENCES "public"."attendance_dates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_year_id_school_years_id_fk" FOREIGN KEY ("school_year_id") REFERENCES "public"."school_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_class_assignments" ADD CONSTRAINT "student_class_assignments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_class_assignments" ADD CONSTRAINT "student_class_assignments_school_year_id_school_years_id_fk" FOREIGN KEY ("school_year_id") REFERENCES "public"."school_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_class_assignments" ADD CONSTRAINT "student_class_assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_dates_school_year_date_key" ON "attendance_dates" USING btree ("school_year_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_date_student_key" ON "attendance_records" USING btree ("attendance_date_id","student_id");--> statement-breakpoint
CREATE INDEX "attendance_records_student_idx" ON "attendance_records" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_school_year_name_key" ON "classes" USING btree ("school_year_id","name");--> statement-breakpoint
CREATE INDEX "classes_school_year_idx" ON "classes" USING btree ("school_year_id");--> statement-breakpoint
CREATE INDEX "classes_teacher_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_years_label_key" ON "school_years" USING btree ("label");--> statement-breakpoint
CREATE INDEX "school_years_is_active_idx" ON "school_years" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "student_class_assignments_student_school_year_key" ON "student_class_assignments" USING btree ("student_id","school_year_id");--> statement-breakpoint
CREATE INDEX "student_class_assignments_class_idx" ON "student_class_assignments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "students_grade_active_idx" ON "students" USING btree ("current_grade_code","active");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_email_key" ON "teachers" USING btree ("email");