ALTER TABLE "student_class_assignments" ADD COLUMN "grade_code" "grade_code";--> statement-breakpoint
UPDATE "student_class_assignments" AS "sca"
SET "grade_code" = "students"."current_grade_code"
FROM "students"
WHERE "sca"."student_id" = "students"."id";--> statement-breakpoint
ALTER TABLE "student_class_assignments" ALTER COLUMN "grade_code" SET NOT NULL;
