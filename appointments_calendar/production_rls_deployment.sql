-- Production deployment script for RLS security implementation
-- Run this in your production Supabase database SQL editor

-- Step 1: Create RLS helper function
CREATE OR REPLACE FUNCTION get_current_provider_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_provider_id', true);
EXCEPTION
  WHEN others THEN
    RETURN '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Enable RLS on all provider-scoped tables
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for data isolation
CREATE POLICY "calendar_connections_provider_isolation" ON "calendar_connections"
  FOR ALL TO public USING ("providerId" = get_current_provider_id());

CREATE POLICY "calendar_events_provider_isolation" ON "calendar_events"
  FOR ALL TO public USING ("providerId" = get_current_provider_id());

CREATE POLICY "bookings_provider_isolation" ON "bookings"
  FOR ALL TO public USING ("providerId" = get_current_provider_id());

CREATE POLICY "provider_locations_provider_isolation" ON "provider_locations"
  FOR ALL TO public USING ("providerId" = get_current_provider_id());

CREATE POLICY "availability_templates_provider_isolation" ON "availability_templates"
  FOR ALL TO public USING ("providerId" = get_current_provider_id());

CREATE POLICY "availability_time_slots_provider_isolation" ON "availability_time_slots"
  FOR ALL TO public USING (
    EXISTS (
      SELECT 1 FROM "availability_templates" 
      WHERE "availability_templates"."id" = "availability_time_slots"."templateId"
      AND "availability_templates"."providerId" = get_current_provider_id()
    )
  );

CREATE POLICY "template_assignments_provider_isolation" ON "template_assignments"
  FOR ALL TO public USING (
    EXISTS (
      SELECT 1 FROM "availability_templates"
      WHERE "availability_templates"."id" = "template_assignments"."templateId"
      AND "availability_templates"."providerId" = get_current_provider_id()
    )
  );

-- Step 4: Force RLS even for privileged database users
ALTER TABLE calendar_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE calendar_events FORCE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE provider_locations FORCE ROW LEVEL SECURITY;
ALTER TABLE availability_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE availability_time_slots FORCE ROW LEVEL SECURITY;
ALTER TABLE template_assignments FORCE ROW LEVEL SECURITY;

-- Verification: Check that RLS is enabled and forced
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled,
  pg_class.relforcerowsecurity as force_rls
FROM pg_tables 
JOIN pg_class ON pg_class.relname = pg_tables.tablename
WHERE schemaname = 'public' 
AND tablename IN (
  'calendar_connections', 
  'calendar_events', 
  'bookings',
  'provider_locations',
  'availability_templates',
  'availability_time_slots',
  'template_assignments'
)
ORDER BY tablename;