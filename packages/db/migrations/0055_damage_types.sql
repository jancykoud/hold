-- The type of damage a price for damage may name, as a body shop names it (docs/vehicle-plan.md step 2): a scratch, an
-- impact, a dent, broken glass. None for a price that names none, as every price so far. No row changes.
ALTER TABLE "price_entries" ADD COLUMN "damage_type" text;--> statement-breakpoint
ALTER TABLE "price_entries" ADD CONSTRAINT "damageType_allowed" CHECK ("price_entries"."damage_type" in ('scratch', 'impact', 'dent', 'broken_glass'));
