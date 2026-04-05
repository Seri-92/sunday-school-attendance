ALTER TABLE "students" RENAME COLUMN "name" TO "last_name";--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "first_name" varchar(128) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "last_name_kana" varchar(128) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "first_name_kana" varchar(128) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "first_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "last_name_kana" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "first_name_kana" DROP DEFAULT;
