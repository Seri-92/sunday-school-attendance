UPDATE "attendance_records"
SET "status" = 'absent',
    "updated_at" = NOW()
WHERE "status" = 'excused';--> statement-breakpoint
