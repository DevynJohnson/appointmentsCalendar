-- Fix RLS by properly defining custom configuration parameters
-- PostgreSQL requires custom config parameters to be defined before use

-- Method 1: Use a different approach with a function-based context
-- Create a function to get the current provider context
CREATE OR REPLACE FUNCTION get_current_provider_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_provider_id', true);
EXCEPTION
  WHEN others THEN
    RETURN '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Method 2: Set up the configuration parameter properly
-- Add the custom parameter to the allowed list (this requires superuser access)
-- Since we can't do this on Supabase, we'll use Method 1

-- Drop existing policies and recreate with the function approach
DROP POLICY IF EXISTS "calendar_connections_provider_isolation" ON "calendar_connections";
DROP POLICY IF EXISTS "calendar_events_provider_isolation" ON "calendar_events";
DROP POLICY IF EXISTS "bookings_provider_isolation" ON "bookings";
DROP POLICY IF EXISTS "provider_locations_provider_isolation" ON "provider_locations";
DROP POLICY IF EXISTS "availability_templates_provider_isolation" ON "availability_templates";
DROP POLICY IF EXISTS "availability_time_slots_provider_isolation" ON "availability_time_slots";
DROP POLICY IF EXISTS "template_assignments_provider_isolation" ON "template_assignments";

-- Recreate policies using the function
CREATE POLICY "calendar_connections_provider_isolation" ON "calendar_connections"
  FOR ALL 
  TO public
  USING ("providerId" = get_current_provider_id());

CREATE POLICY "calendar_events_provider_isolation" ON "calendar_events"
  FOR ALL
  TO public
  USING ("providerId" = get_current_provider_id());

CREATE POLICY "bookings_provider_isolation" ON "bookings"
  FOR ALL
  TO public
  USING ("providerId" = get_current_provider_id());

CREATE POLICY "provider_locations_provider_isolation" ON "provider_locations"
  FOR ALL
  TO public
  USING ("providerId" = get_current_provider_id());

CREATE POLICY "availability_templates_provider_isolation" ON "availability_templates"
  FOR ALL
  TO public
  USING ("providerId" = get_current_provider_id());

CREATE POLICY "availability_time_slots_provider_isolation" ON "availability_time_slots"
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM "availability_templates" 
      WHERE "availability_templates"."id" = "availability_time_slots"."templateId"
      AND "availability_templates"."providerId" = get_current_provider_id()
    )
  );

CREATE POLICY "template_assignments_provider_isolation" ON "template_assignments"
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM "availability_templates"
      WHERE "availability_templates"."id" = "template_assignments"."templateId"
      AND "availability_templates"."providerId" = get_current_provider_id()
    )
  );