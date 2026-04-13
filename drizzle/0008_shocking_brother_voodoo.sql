ALTER TABLE "classes" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;
UPDATE "classes"
SET "sort_order" = CASE "name"
  WHEN '幼稚科' THEN 1
  WHEN '1・2年' THEN 2
  WHEN '3・4年' THEN 3
  WHEN '5・6年' THEN 4
  WHEN '中学科' THEN 5
  ELSE "sort_order"
END;
