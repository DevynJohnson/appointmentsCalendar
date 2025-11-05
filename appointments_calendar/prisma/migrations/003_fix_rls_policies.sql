-- Fix RLS policies by removing problematic admin bypass policies
-- The admin bypass policies are interfering with proper RLS isolation

-- Drop the admin bypass policies that are causing issues
DROP POLICY IF EXISTS "calendar_connections_admin_bypass" ON "calendar_connections";
DROP POLICY IF EXISTS "calendar_events_admin_bypass" ON "calendar_events";
DROP POLICY IF EXISTS "bookings_admin_bypass" ON "bookings";
DROP POLICY IF EXISTS "provider_locations_admin_bypass" ON "provider_locations";
DROP POLICY IF EXISTS "availability_templates_admin_bypass" ON "availability_templates";
DROP POLICY IF EXISTS "availability_time_slots_admin_bypass" ON "availability_time_slots";
DROP POLICY IF EXISTS "template_assignments_admin_bypass" ON "template_assignments";

-- Recreate the provider isolation policies to be more explicit
-- Only allow access when provider context is properly set

DROP POLICY IF EXISTS "calendar_connections_provider_isolation" ON "calendar_connections";
CREATE POLICY "calendar_connections_provider_isolation" ON "calendar_connections"
  FOR ALL 
  TO public
  USING (
    "providerId" = current_setting('app.current_provider_id', false)
  );

DROP POLICY IF EXISTS "calendar_events_provider_isolation" ON "calendar_events";
CREATE POLICY "calendar_events_provider_isolation" ON "calendar_events"
  FOR ALL
  TO public
  USING (
    "providerId" = current_setting('app.current_provider_id', false)
  );

DROP POLICY IF EXISTS "bookings_provider_isolation" ON "bookings";
CREATE POLICY "bookings_provider_isolation" ON "bookings"
  FOR ALL
  TO public
  USING (
    "providerId" = current_setting('app.current_provider_id', false)
  );

DROP POLICY IF EXISTS "provider_locations_provider_isolation" ON "provider_locations";
CREATE POLICY "provider_locations_provider_isolation" ON "provider_locations"
  FOR ALL
  TO public
  USING (
    "providerId" = current_setting('app.current_provider_id', false)
  );

DROP POLICY IF EXISTS "availability_templates_provider_isolation" ON "availability_templates";
CREATE POLICY "availability_templates_provider_isolation" ON "availability_templates"
  FOR ALL
  TO public
  USING (
    "providerId" = current_setting('app.current_provider_id', false)
  );

DROP POLICY IF EXISTS "availability_time_slots_provider_isolation" ON "availability_time_slots";
CREATE POLICY "availability_time_slots_provider_isolation" ON "availability_time_slots"
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM "availability_templates" 
      WHERE "availability_templates"."id" = "availability_time_slots"."templateId"
      AND "availability_templates"."providerId" = current_setting('app.current_provider_id', false)
    )
  );

DROP POLICY IF EXISTS "template_assignments_provider_isolation" ON "template_assignments";
CREATE POLICY "template_assignments_provider_isolation" ON "template_assignments"
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM "availability_templates"
      WHERE "availability_templates"."id" = "template_assignments"."templateId"
      AND "availability_templates"."providerId" = current_setting('app.current_provider_id', false)
    )
  );