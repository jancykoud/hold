-- A vehicle's dashboard as a person read it at a handover or a return (docs/vehicle-plan.md step 3, part B): the
-- kilometres on its odometer and the fuel in its tank, in eighths. Both or neither, kept on the session until it is
-- sealed, when the reading goes into the manifest with the photographs. No row changes: every session so far has none.
ALTER TABLE "capture_sessions" ADD COLUMN "odometer_km" integer;--> statement-breakpoint
ALTER TABLE "capture_sessions" ADD COLUMN "fuel_eighths" integer;--> statement-breakpoint
ALTER TABLE "capture_sessions" ADD CONSTRAINT "reading_whole" CHECK (("capture_sessions"."odometer_km" is null) = ("capture_sessions"."fuel_eighths" is null));--> statement-breakpoint
ALTER TABLE "capture_sessions" ADD CONSTRAINT "reading_in_range" CHECK ("capture_sessions"."odometer_km" >= 0 and "capture_sessions"."fuel_eighths" between 0 and 8);
