-- Two more kinds of price, for a vehicle's readings (docs/vehicle-plan.md step 3): a kilometre beyond those a rental
-- includes, and an eighth of a tank missing. Each is the price of one, and a claim line takes it as many times as the
-- dashboard says. No row changes: every kind already stored is still allowed.
ALTER TABLE "price_entries" DROP CONSTRAINT "category_allowed";--> statement-breakpoint
ALTER TABLE "price_entries" ADD CONSTRAINT "category_allowed" CHECK ("price_entries"."category" in ('damage', 'loss', 'lateness', 'cleaning', 'mileage', 'fuel'));
