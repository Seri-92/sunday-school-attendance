CREATE TABLE "class_teacher_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "class_teacher_assignments" ("class_id", "teacher_id")
SELECT "id", "teacher_id"
FROM "classes"
WHERE "teacher_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_teacher_id_teachers_id_fk";
--> statement-breakpoint
DROP INDEX "classes_teacher_idx";--> statement-breakpoint
ALTER TABLE "class_teacher_assignments" ADD CONSTRAINT "class_teacher_assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_teacher_assignments" ADD CONSTRAINT "class_teacher_assignments_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_teacher_assignments_class_teacher_key" ON "class_teacher_assignments" USING btree ("class_id","teacher_id");--> statement-breakpoint
CREATE INDEX "class_teacher_assignments_class_idx" ON "class_teacher_assignments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "class_teacher_assignments_teacher_idx" ON "class_teacher_assignments" USING btree ("teacher_id");--> statement-breakpoint
ALTER TABLE "classes" DROP COLUMN "teacher_id";
