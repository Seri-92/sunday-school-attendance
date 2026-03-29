ALTER TABLE "teachers" ADD COLUMN "auth_user_id" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_auth_user_id_key" ON "teachers" USING btree ("auth_user_id");