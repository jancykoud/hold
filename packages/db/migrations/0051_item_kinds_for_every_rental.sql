-- Hold serves every kind of rental now, not only the bike shop it began with: twenty more kinds of item, from a car
-- to a room, each with a suggested photo plan in packages/domain/src/photo-plan.ts. The two columns that store a kind
-- accept them. No row changes: every kind already stored is still allowed.
--
-- drizzle-kit also wanted to drop and re-add the amount checks of 0050 under other names. Left out by hand: those
-- are NOT VALID on purpose, and re-adding them would read the whole money log under a lock.
ALTER TABLE "item_types" DROP CONSTRAINT "category_allowed";--> statement-breakpoint
ALTER TABLE "rental_outcomes" DROP CONSTRAINT "itemCategory_allowed";--> statement-breakpoint
ALTER TABLE "item_types" ADD CONSTRAINT "category_allowed" CHECK ("item_types"."category" in ('bike', 'e_bike', 'scooter', 'water', 'snow', 'camera', 'camping', 'event', 'tool', 'car', 'van', 'motorhome', 'motorbike', 'trailer', 'boat', 'machinery', 'garden', 'mobility', 'baby', 'instrument', 'clothing', 'luxury', 'electronics', 'drone', 'stage', 'sport', 'furniture', 'travel', 'space', 'other'));--> statement-breakpoint
ALTER TABLE "rental_outcomes" ADD CONSTRAINT "itemCategory_allowed" CHECK ("rental_outcomes"."item_category" in ('bike', 'e_bike', 'scooter', 'water', 'snow', 'camera', 'camping', 'event', 'tool', 'car', 'van', 'motorhome', 'motorbike', 'trailer', 'boat', 'machinery', 'garden', 'mobility', 'baby', 'instrument', 'clothing', 'luxury', 'electronics', 'drone', 'stage', 'sport', 'furniture', 'travel', 'space', 'other'));
