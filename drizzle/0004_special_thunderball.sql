ALTER TABLE "teachers" ADD COLUMN "name" varchar(128);--> statement-breakpoint
UPDATE "teachers"
SET "name" = split_part("email", '@', 1)
WHERE "name" IS NULL;--> statement-breakpoint
ALTER TABLE "teachers" ALTER COLUMN "name" SET NOT NULL;
