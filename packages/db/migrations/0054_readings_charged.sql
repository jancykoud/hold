-- What a vehicle's readings are charged (docs/vehicle-plan.md step 3, part C). A type that is driven says how many
-- kilometres each day includes, a booking keeps that figure for its item, and a claim line says how many of its entry
-- it charges: one, as every line so far, or as many kilometres or eighths of a tank as plain code counted from the two
-- readings. No row changes: a column added with a constant default does not rewrite the append-only claim lines.
ALTER TABLE "claim_lines" DROP CONSTRAINT "source_allowed";--> statement-breakpoint
ALTER TABLE "item_types" ADD COLUMN "included_km_per_day" integer;--> statement-breakpoint
ALTER TABLE "claim_lines" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_items" ADD COLUMN "included_km_per_day" integer;--> statement-breakpoint
ALTER TABLE "item_types" ADD CONSTRAINT "included_km_per_day_non_negative" CHECK ("item_types"."included_km_per_day" >= 0);--> statement-breakpoint
ALTER TABLE "claim_lines" ADD CONSTRAINT "quantity_positive" CHECK ("claim_lines"."quantity" >= 1);--> statement-breakpoint
ALTER TABLE "claim_lines" ADD CONSTRAINT "source_allowed" CHECK ("claim_lines"."source" in ('finding', 'person', 'agreed_in_rental', 'reading'));
